import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';

// iOS-only placeholder shown in place of the Plan & Limits license activation UI —
// temporary Apple 3.1.1 compliance measure. Modeled on OnlineStoreComingSoon.tsx for
// visual consistency, kept as a separate component/file since the two screens are
// functionally independent (separate stores, separate i18n namespaces).
export function PlanLimitsComingSoon() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <View style={styles.placeholder}>
      <View style={[styles.iconWrap, { backgroundColor: colors.softBlue, borderColor: colors.lightBlue }]}>
        <Ionicons name="rocket" size={56} color={colors.primary} />
      </View>
      <Text style={[styles.heading, { color: colors.darkBlue }]}>
        {t('settings.upgradeScreen.comingSoonHeading')}
      </Text>
      <Text style={[styles.sub, { color: colors.gray500 }]}>
        {t('settings.upgradeScreen.comingSoonBody')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconWrap: {
    width: 110,
    height: 110,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  sub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
