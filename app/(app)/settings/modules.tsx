import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingSection } from '@/components/settings/SettingSection';
import { SettingSwitch } from '@/components/settings/SettingSwitch';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useModuleStore } from '@/store/moduleStore';
import { MODULES } from '@/constants/config';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function ModulesScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { modules, toggleModule } = useModuleStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('settings.modulesScreen.title')} showBack />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <SettingSection title={t('settings.modulesScreen.section')}>
          {MODULES.map((mod) => (
            <SettingSwitch
              key={mod.id}
              icon={mod.icon as ComponentProps<typeof Ionicons>['name']}
              label={t(`modules.${mod.id}.title`)}
              sub={t(mod.descriptionKey)}
              value={modules[mod.id]?.enabled ?? true}
              onToggle={() => toggleModule(mod.id)}
            />
          ))}
        </SettingSection>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body:      { padding: 16, paddingTop: 8 },
});
