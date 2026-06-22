import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { useAppTheme } from '@/contexts/ThemeContext';
import { TUTORIAL_CATEGORIES } from '@/lib/tutorials';

export default function TutorialsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('settings.tutorialsScreen.title')} showBack />

      {TUTORIAL_CATEGORIES.length === 0 ? (
        <View style={styles.placeholder}>
          <View style={[styles.iconWrap, { backgroundColor: colors.softBlue, borderColor: colors.lightBlue }]}>
            <Ionicons name="play-circle" size={56} color={colors.primary} />
          </View>
          <Text style={[styles.heading, { color: colors.darkBlue }]}>
            {t('settings.tutorialsScreen.comingSoon')}
          </Text>
          <Text style={[styles.sub, { color: colors.gray500 }]}>
            {t('settings.tutorialsSub')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
