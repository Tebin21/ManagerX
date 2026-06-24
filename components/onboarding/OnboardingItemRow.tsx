import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import type { OnboardingItem } from '@/constants/onboardingSlides';

interface Props {
  item: OnboardingItem;
}

export function OnboardingItemRow({ item }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { flexDirection, textAlign } = useRTL();

  return (
    <View style={[styles.row, { flexDirection }]}>
      <View style={[styles.iconWrapper, { backgroundColor: colors.softBlue }]}>
        <Ionicons name={item.icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.label, { color: colors.darkBlue, textAlign }]} numberOfLines={2}>
        {t(item.labelKey)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '48%',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
