import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/common/AppHeader';
import { SettingSection } from '@/components/settings/SettingSection';
import { SettingSwitch } from '@/components/settings/SettingSwitch';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { notifications, setNotification } = useSettingsStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('settings.notificationsScreen.title')} showBack />

      <View style={styles.body}>
        <SettingSection title={t('settings.notificationsScreen.alerts')}>
          <SettingSwitch
            icon="cube-outline"
            label={t('settings.notificationsScreen.lowStock')}
            sub={t('settings.notificationsScreen.lowStockSub')}
            value={notifications.lowStock}
            onToggle={(v) => setNotification('lowStock', v)}
          />
          <SettingSwitch
            icon="cash-outline"
            label={t('settings.notificationsScreen.debtReminder')}
            sub={t('settings.notificationsScreen.debtReminderSub')}
            value={notifications.debtReminder}
            onToggle={(v) => setNotification('debtReminder', v)}
          />
          <SettingSwitch
            icon="card-outline"
            label={t('settings.notificationsScreen.paymentReminder')}
            sub={t('settings.notificationsScreen.paymentReminderSub')}
            value={notifications.paymentReminder}
            onToggle={(v) => setNotification('paymentReminder', v)}
          />
          <SettingSwitch
            icon="bar-chart-outline"
            label={t('settings.notificationsScreen.dailySummary')}
            sub={t('settings.notificationsScreen.dailySummarySub')}
            value={notifications.dailySummary}
            onToggle={(v) => setNotification('dailySummary', v)}
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
