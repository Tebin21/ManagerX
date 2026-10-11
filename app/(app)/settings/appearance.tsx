import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingSection } from '@/components/settings/SettingSection';
import { SettingRow } from '@/components/settings/SettingRow';
import { ThemeToggleSwitch } from '@/components/settings/ThemeToggleSwitch';
import { SettingsBackground } from '@/components/settings/SettingsBackground';
import { useAppTheme } from '@/contexts/ThemeContext';

export default function AppearanceScreen() {
  const { t } = useTranslation();
  const { colors, isDark, toggle } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <SettingsBackground />
      <AppHeader title={t('settings.appearanceScreen.title')} showBack />

      <View style={styles.body}>
        <SettingSection title={t('settings.appearanceScreen.theme')}>
          <SettingRow
            icon={isDark ? 'moon' : 'sunny'}
            label={t('settings.appearanceScreen.darkMode')}
            sub={t('settings.appearanceScreen.darkSub')}
            chevron={false}
            rightElement={
              <ThemeToggleSwitch
                value={isDark}
                onToggle={toggle}
              />
            }
            onPress={toggle}
          />
        </SettingSection>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body:      { padding: 16, paddingTop: 8 },
});
