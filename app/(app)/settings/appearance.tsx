import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingSection } from '@/components/settings/SettingSection';
import { SettingSwitch } from '@/components/settings/SettingSwitch';
import { useAppTheme } from '@/contexts/ThemeContext';

export default function AppearanceScreen() {
  const { t } = useTranslation();
  const { colors, isDark, toggle } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('settings.appearanceScreen.title')} showBack />

      <View style={styles.body}>
        <SettingSection title={t('settings.appearanceScreen.theme')}>
          <SettingSwitch
            icon="moon"
            label={t('settings.appearanceScreen.darkMode')}
            sub={t('settings.appearanceScreen.darkSub')}
            value={isDark}
            onToggle={toggle}
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
