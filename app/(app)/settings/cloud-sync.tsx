import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingSection } from '@/components/settings/SettingSection';
import { SettingRow } from '@/components/settings/SettingRow';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import { getDatabase } from '@/lib/sqlite';
import { isFirebaseAvailable } from '@/lib/firebase';
import { getLastSyncedAt, getLastSyncError, pushPendingChanges } from '@/lib/cloudSync';
import { formatRelativeTime } from '@/utils/formatters';

export default function CloudSyncScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const user = useAuthStore((s) => s.user);

  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [lastSyncedAt, setLastSyncedAtState] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const db = await getDatabase();
    const [row, syncedAt, error] = await Promise.all([
      db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM cloud_sync_queue'),
      getLastSyncedAt(),
      getLastSyncError(),
    ]);
    setPendingCount(row?.cnt ?? 0);
    setLastSyncedAtState(syncedAt);
    setLastError(error);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useEffect(() => {
    if (!syncing) return;
    const interval = setInterval(refresh, 1500);
    return () => clearInterval(interval);
  }, [syncing, refresh]);

  const handleSyncNow = async () => {
    if (!user || !isFirebaseAvailable) return;
    setSyncing(true);
    try {
      await pushPendingChanges(user.id);
    } finally {
      setSyncing(false);
      refresh();
    }
  };

  const statusLabel = syncing
    ? t('settings.cloudSyncScreen.statusSyncing')
    : pendingCount === null
    ? ''
    : pendingCount === 0
    ? t('settings.cloudSyncScreen.statusUpToDate')
    : t('settings.cloudSyncScreen.statusPending', { count: pendingCount });

  const lastSyncedLabel = lastSyncedAt
    ? t('settings.cloudSyncScreen.lastSynced', { time: formatRelativeTime(lastSyncedAt) })
    : t('settings.cloudSyncScreen.lastSyncedNever');

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('settings.cloudSyncScreen.title')} showBack />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {user?.email && (
          <Text style={[styles.signedInAs, { color: colors.gray500 }]}>
            {t('settings.cloudSyncScreen.signedInAs', { email: user.email })}
          </Text>
        )}

        <SettingSection title={t('settings.dataScreen.syncSection')}>
          <SettingRow
            icon="sync"
            label={statusLabel}
            sub={lastSyncedLabel}
            chevron={false}
            onPress={() => {}}
          />
          <SettingRow
            icon="cloud-done"
            label={t('settings.cloudSyncScreen.syncNowBtn')}
            onPress={handleSyncNow}
            disabled={syncing || !isFirebaseAvailable}
            rightElement={syncing ? <ActivityIndicator size="small" color={colors.primary} /> : undefined}
          />
        </SettingSection>

        {lastError ? (
          <SettingSection title={t('settings.cloudSyncScreen.syncErrorTitle')}>
            <View style={styles.errorBox}>
              <Text style={[styles.errorText, { color: colors.error }]}>{lastError}</Text>
            </View>
          </SettingSection>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  signedInAs: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    marginTop: 4,
  },
  errorBox: {
    padding: 14,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
