import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useTranslation } from 'react-i18next';
import { SUPPORT_PHONE } from '@/constants/config';
import { useAppTheme } from '@/contexts/ThemeContext';

export function SupportFooter() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={[styles.divider, { backgroundColor: colors.gray200 }]} />
      <Text style={[styles.label, { color: colors.gray400 }]}>{t('support.label')}</Text>
      <Text style={[styles.phone, { color: colors.gray400 }]}>{SUPPORT_PHONE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  divider: {
    width: '60%',
    height: 1,
    marginBottom: 16,
    opacity: 0.6,
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  phone: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
