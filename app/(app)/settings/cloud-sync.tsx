import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingSection } from '@/components/settings/SettingSection';
import { SettingRow } from '@/components/settings/SettingRow';
import { SettingsBackground } from '@/components/settings/SettingsBackground';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useAuthStore } from '@/store/authStore';
import { getDatabase } from '@/lib/sqlite';
import { isFirebaseAvailable } from '@/lib/firebase';
import { addConnectivityListener } from '@/lib/netInfo';
import { getLastSyncedAt, getLastSyncError, pushPendingChanges } from '@/lib/cloudSync';
import { formatRelativeTime } from '@/utils/formatters';
import { hexToRgba } from '@/lib/colorUtils';
import {
  getGoogleDriveConfig,
  connectGoogleDrive,
  disconnectGoogleDrive,
  uploadBackupToGoogleDrive,
  setAutoBackupEnabled,
  type GoogleDriveConfig,
} from '@/lib/googleDriveBackup';

export default function CloudSyncScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, flexDirection } = useRTL();
  const user = useAuthStore((s) => s.user);

  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [lastSyncedAt, setLastSyncedAtState] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Google Drive state
  const [gdriveConfig, setGdriveConfig] = useState<GoogleDriveConfig | null>(null);
  const [gdriveLoading, setGdriveLoading] = useState(false);
  const [gdriveSyncing, setGdriveSyncing] = useState(false);

  useEffect(() => {
    // Optimistic default (true) — a device without the NetInfo native module
    // linked never fires this listener at all (see lib/netInfo.ts), so it
    // should never get stuck falsely showing "Offline".
    return addConnectivityListener(setIsOnline);
  }, []);

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

  async function loadGdriveConfig() {
    try {
      const cfg = await getGoogleDriveConfig();
      setGdriveConfig(cfg);
    } catch {
      // Non-fatal
    }
  }

  useFocusEffect(
    useCallback(() => {
      refresh();
      loadGdriveConfig();
      // Explicit, user-initiated cloud sync start — cold-start auto-start is
      // gated off (see lib/cloudSync/index.ts's AUTO_START_ENABLED), so opening
      // this screen is what actually starts push/pull for a signed-in user.
      // Safe to call every focus: startCloudPush/startCloudPull already no-op
      // once already running for this uid.
      if (user && isFirebaseAvailable) {
        import('@/lib/cloudSync').then((m) => m.startCloudSync(user.id, { auto: false }));
      }
    }, [user, refresh])
  );

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

  async function handleConnectGDrive() {
    setGdriveLoading(true);
    try {
      const cfg = await connectGoogleDrive();
      setGdriveConfig(cfg);
      Alert.alert(
        t('settings.dataScreen.googleDriveConnected'),
        cfg.email ?? ''
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('CANCELED') && !msg.includes('SIGN_IN_CANCELLED')) {
        Alert.alert(t('common.error'), t('common.tryAgain'));
      }
    } finally {
      setGdriveLoading(false);
    }
  }

  async function handleDisconnectGDrive() {
    Alert.alert(
      t('settings.dataScreen.googleDriveDisconnectBtn'),
      t('settings.dataScreen.googleDriveDisconnectBtn') + '?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.dataScreen.googleDriveDisconnectBtn'),
          style: 'destructive',
          onPress: async () => {
            await disconnectGoogleDrive();
            await loadGdriveConfig();
          },
        },
      ]
    );
  }

  async function handleGDriveBackup() {
    setGdriveSyncing(true);
    try {
      await uploadBackupToGoogleDrive();
      await loadGdriveConfig();
      Alert.alert(
        t('settings.dataScreen.googleDriveBackupSuccess'),
        t('settings.dataScreen.googleDriveBackupSuccessMsg')
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'GDRIVE_AUTH_REQUIRED') {
        Alert.alert(t('common.error'), t('settings.dataScreen.googleDriveNotConnected'));
      } else {
        Alert.alert(t('settings.dataScreen.backupError'), t('settings.dataScreen.backupErrorMsg'));
      }
    } finally {
      setGdriveSyncing(false);
    }
  }

  async function handleToggleGDriveAuto(enabled: boolean) {
    await setAutoBackupEnabled(enabled);
    await loadGdriveConfig();
  }

  const statusLabel = !isOnline
    ? t('settings.cloudSyncScreen.statusOffline')
    : syncing
    ? t('settings.cloudSyncScreen.statusSyncing')
    : pendingCount === null
    ? ''
    : pendingCount === 0
    ? t('settings.cloudSyncScreen.statusUpToDate')
    // Pending changes plus a recorded last error most likely means the last
    // attempt(s) failed and the automatic interval/reconnect triggers are
    // about to retry — distinct from a fresh, not-yet-attempted pending count.
    : lastError
    ? t('settings.cloudSyncScreen.statusRetrying')
    : t('settings.cloudSyncScreen.statusPending', { count: pendingCount });

  const lastSyncedLabel = lastSyncedAt
    ? t('settings.cloudSyncScreen.lastSynced', { time: formatRelativeTime(lastSyncedAt) })
    : t('settings.cloudSyncScreen.lastSyncedNever');

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <SettingsBackground />
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

        {/* ── Google Drive Personal Backup Section ───────────────────── */}
        <SettingSection title={t('settings.dataScreen.googleDriveSection')}>
          <View
            style={[
              styles.gdriveBanner,
              {
                backgroundColor: isDark ? hexToRgba(colors.primary, 0.12) : hexToRgba(colors.primary, 0.08),
                borderColor: isDark ? hexToRgba(colors.primary, 0.30) : hexToRgba(colors.primary, 0.22),
              },
            ]}
          >
            <View style={{ flexDirection, alignItems: 'center', gap: 8 }}>
              <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
              <Text
                style={[
                  styles.gdriveBannerText,
                  { color: isDark ? colors.primary : colors.black },
                ]}
              >
                {t('settings.dataScreen.googleDrivePrivacyBadge')}
              </Text>
            </View>
          </View>

          <SettingRow
            icon="logo-google"
            label={
              gdriveConfig?.isConnected
                ? (gdriveConfig.email ?? t('settings.dataScreen.googleDriveConnected'))
                : t('settings.dataScreen.googleDriveNotConnected')
            }
            sub={
              gdriveConfig?.isConnected
                ? t('settings.dataScreen.googleDriveConnected')
                : t('settings.dataScreen.googleDriveConnectBtn')
            }
            chevron={false}
            onPress={
              gdriveConfig?.isConnected
                ? handleDisconnectGDrive
                : handleConnectGDrive
            }
            rightElement={
              gdriveLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <TouchableOpacity
                  onPress={
                    gdriveConfig?.isConnected
                      ? handleDisconnectGDrive
                      : handleConnectGDrive
                  }
                  style={[
                    styles.gdriveActionBtn,
                    {
                      backgroundColor: gdriveConfig?.isConnected
                        ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2')
                        : colors.primary,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <Ionicons
                    name={gdriveConfig?.isConnected ? 'close-circle' : 'logo-google'}
                    size={15}
                    color={gdriveConfig?.isConnected ? '#EF4444' : '#FFFFFF'}
                  />
                  <Text
                    style={[
                      styles.gdriveActionBtnText,
                      {
                        color: gdriveConfig?.isConnected
                          ? '#EF4444'
                          : '#FFFFFF',
                      },
                    ]}
                  >
                    {gdriveConfig?.isConnected
                      ? t('settings.dataScreen.googleDriveDisconnectBtn')
                      : t('settings.dataScreen.googleDriveConnectBtn')}
                  </Text>
                </TouchableOpacity>
              )
            }
          />

          {gdriveConfig?.isConnected && (
            <>
              <SettingRow
                icon="sync"
                label={t('settings.dataScreen.googleDriveAutoBackup')}
                sub={t('settings.dataScreen.googleDriveAutoBackupSub')}
                chevron={false}
                rightElement={
                  <Switch
                    value={gdriveConfig.autoBackupEnabled}
                    onValueChange={handleToggleGDriveAuto}
                    trackColor={{ false: colors.gray200, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                }
              />

              <SettingRow
                icon="cloud-upload"
                label={t('settings.dataScreen.googleDriveBackupNow')}
                sub={
                  gdriveConfig.lastBackupAt
                    ? t('settings.dataScreen.googleDriveLastBackup', {
                        time: new Date(gdriveConfig.lastBackupAt).toLocaleString(),
                      })
                    : t('settings.dataScreen.googleDriveNeverBackedUp')
                }
                onPress={handleGDriveBackup}
                disabled={gdriveSyncing}
                rightElement={
                  gdriveSyncing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : undefined
                }
              />
            </>
          )}
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
  gdriveBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  gdriveBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  gdriveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  gdriveActionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  errorBox: {
    padding: 14,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
