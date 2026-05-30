import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useTranslation } from 'react-i18next';
import { SUPPORT_PHONE, SUPPORT_EMAIL } from '@/constants/config';
import { Colors } from '@/constants/colors';

export function SupportFooter() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      <Text style={styles.label}>{t('support.label')}</Text>
      <Text style={styles.contact}>{SUPPORT_PHONE}</Text>
      <Text style={styles.contact}>{SUPPORT_EMAIL}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: Colors.gray200,
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  contact: {
    fontSize: 12,
    color: Colors.gray400,
    marginBottom: 2,
  },
});
