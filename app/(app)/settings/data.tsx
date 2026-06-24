/**
 * Data Management screen.
 *
 * expo-document-picker and expo-sharing are loaded lazily inside their handler
 * functions. Static top-level imports of those packages would call
 * requireNativeModule() at bundle-evaluation time, crashing Expo Go if the
 * native module is not bundled in the running client.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingSection } from '@/components/settings/SettingSection';
import { SettingRow } from '@/components/settings/SettingRow';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { applyKurdishFont } from '@/lib/settingsFont';
import { getDatabase } from '@/lib/sqlite';
import {
  exportBackup,
  validateAndParseBackup,
  performRestore,
  type ManagerXBackup,
} from '@/lib/backup';
import { useAuthStore }     from '@/store/authStore';
import { useBusinessStore }  from '@/store/businessStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useSettingsStore }  from '@/store/settingsStore';
import { useLanguageStore }  from '@/store/languageStore';
import { useModuleStore }    from '@/store/moduleStore';

// Expo Go bundles a fixed set of native modules. Custom modules added to
// package.json (like expo-document-picker) are NOT available there.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

// ─────────────────────────────────────────────────────────────────────────────

export default function DataScreen() {
  const { t }              = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { flexDirection }  = useRTL();
  const router             = useRouter();
  const signOut            = useAuthStore((s) => s.signOut);
  const isKurdish          = useLanguageStore((s) => s.language === 'ku');

  const [backing,          setBacking]          = useState(false);
  const [restoring,        setRestoring]        = useState(false);
  const [resetting,        setResetting]        = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showResetModal,   setShowResetModal]   = useState(false);
  const [resetInput,       setResetInput]       = useState('');
  const [pendingBackup,    setPendingBackup]    = useState<ManagerXBackup | null>(null);
  const [dbRecords,        setDbRecords]        = useState<number | null>(null);

  useEffect(() => { void loadDbStats(); }, []);

  async function loadDbStats() {
    try {
      const db = await getDatabase();
      const counts = await Promise.all([
        db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM products'),
        db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM sales'),
        db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM purchases'),
        db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM customers'),
      ]);
      setDbRecords(counts.reduce((s, r) => s + (r?.cnt ?? 0), 0));
    } catch {
      setDbRecords(0);
    }
  }

  // ── Backup ────────────────────────────────────────────────────────────────
  // expo-sharing is loaded lazily so that a missing native module never crashes
  // the screen at mount time.

  async function handleBackup() {
    setBacking(true);
    try {
      const uri = await exportBackup();

      // Try to open the system share sheet; fail gracefully if unavailable.
      try {
        const Sharing    = await import('expo-sharing');
        const canShare   = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType:    'application/json',
            dialogTitle: t('settings.dataScreen.backupData'),
            UTI:         'public.json',
          });
          return;
        }
      } catch {
        // Sharing module not available on this device / build — fall through.
      }

      Alert.alert(
        t('settings.dataScreen.backupSuccess'),
        t('settings.dataScreen.backupSuccessMsg'),
      );
    } catch {
      Alert.alert(
        t('settings.dataScreen.backupError'),
        t('settings.dataScreen.backupErrorMsg'),
      );
    } finally {
      setBacking(false);
    }
  }

  // ── Restore step 1 — pick file ────────────────────────────────────────────
  // expo-document-picker is loaded lazily here. A static import at the top of
  // this file would call requireNativeModule('ExpoDocumentPicker') immediately
  // at module-evaluation time and crash Expo Go before the screen is visible.

  async function handlePickRestore() {
    // Fast-path: detect Expo Go and show a friendly explanation rather than
    // attempting to load the native module at all.
    if (IS_EXPO_GO) {
      Alert.alert(
        t('settings.dataScreen.devBuildTitle'),
        t('settings.dataScreen.devBuildMsg'),
      );
      return;
    }

    // Lazy-load the native module. If the build doesn't include it, catch the
    // "Cannot find native module" error before it propagates.
    let DocumentPicker: typeof import('expo-document-picker');
    try {
      DocumentPicker = await import('expo-document-picker');
    } catch {
      Alert.alert(
        t('settings.dataScreen.devBuildTitle'),
        t('settings.dataScreen.devBuildMsg'),
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type:                 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      try {
        const backup = await validateAndParseBackup(asset.uri);
        setPendingBackup(backup);
        setShowRestoreModal(true);
      } catch (err: unknown) {
        const code = err instanceof Error ? err.message : '';
        Alert.alert(
          code === 'INVALID_JSON' || code === 'INVALID_BACKUP'
            ? t('settings.dataScreen.restoreInvalidFile')
            : t('settings.dataScreen.restoreError'),
          code === 'INVALID_JSON' || code === 'INVALID_BACKUP'
            ? t('settings.dataScreen.restoreInvalidFileMsg')
            : t('settings.dataScreen.restoreErrorMsg'),
        );
      }
    } catch {
      // User dismissed the picker or the OS returned an unexpected error —
      // no action needed.
    }
  }

  // ── Restore step 2 — confirmed by user ───────────────────────────────────

  async function handleConfirmRestore() {
    if (!pendingBackup) return;
    setRestoring(true);
    try {
      await performRestore(pendingBackup);

      // Sync all persisted Zustand stores with the newly restored AsyncStorage values.
      await Promise.all([
        useBusinessStore.persist.rehydrate(),
        useSettingsStore.persist.rehydrate(),
        useLanguageStore.persist.rehydrate(),
        useModuleStore.persist.rehydrate(),
      ]);

      setShowRestoreModal(false);
      setPendingBackup(null);

      // Replace the entire navigation stack so every screen remounts and reloads
      // its data from the freshly restored SQLite database.
      router.replace('/');
    } catch {
      Alert.alert(
        t('settings.dataScreen.restoreError'),
        t('settings.dataScreen.restoreErrorMsg'),
      );
    } finally {
      setRestoring(false);
    }
  }

  function handleDismissRestore() {
    if (restoring) return;
    setShowRestoreModal(false);
    setPendingBackup(null);
  }

  // ── Reset app ─────────────────────────────────────────────────────────────

  function handleResetApp() {
    setResetInput('');
    setShowResetModal(true);
  }

  function handleDismissReset() {
    if (resetting) return;
    setShowResetModal(false);
    setResetInput('');
  }

  async function executeReset() {
    setResetting(true);
    try {
      const db = await getDatabase();
      for (const table of [
        'purchase_audit_log', 'purchase_items', 'purchase_debts', 'debt_payments',
        'sale_items', 'debts', 'sales', 'purchases',
        'products', 'customers', 'suppliers', 'expenses',
        'exchange_rates', 'reports_cache',
        'invoice_counter', 'purchase_counter',
        'inventory_history', 'categories',
        'settings', 'businesses',
      ]) {
        await db.runAsync(`DELETE FROM ${table}`);
      }
      // Re-seed rows that must exist for the app to function
      await db.runAsync(`INSERT OR REPLACE INTO invoice_counter (id, last_number, last_date) VALUES (1, 0, '')`);
      await db.runAsync(`INSERT OR REPLACE INTO purchase_counter (id, last_number, last_date) VALUES (1, 0, '')`);
      await db.runAsync(`INSERT OR REPLACE INTO exchange_rates (id, rate, note) VALUES (1, 1310, 'Initial rate')`);
      await AsyncStorage.multiRemove([
        '@managerx_business',
        '@managerx_settings',
        '@managerx_modules',
        '@managerx_language',
        '@managerx_onboarding',
      ]);
      // Clear in-memory business state so isSetupComplete is false immediately.
      useBusinessStore.getState().clearBusiness();
      useOnboardingStore.getState().resetOnboarding();
      await signOut();
      router.replace('/(onboarding)/welcome' as never);
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
      setResetting(false);
      setShowResetModal(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const healthSub = dbRecords !== null
    ? `${dbRecords} ${t('settings.dataScreen.records')}`
    : '…';

  const restoreSub = IS_EXPO_GO
    ? t('settings.dataScreen.devBuildRequired')
    : t('settings.dataScreen.restoreBackupSub');

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('settings.dataScreen.title')} showBack />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Backup & Restore ─────────────────────────────────────────── */}
        <SettingSection title={t('settings.dataScreen.backupRestore')}>
          <SettingRow
            icon="cloud-upload"
            label={t('settings.dataScreen.backupData')}
            sub={t('settings.dataScreen.backupDataSub')}
            onPress={handleBackup}
            disabled={backing || restoring}
            rightElement={
              backing
                ? <ActivityIndicator size="small" color={colors.primary} />
                : undefined
            }
          />
          <SettingRow
            icon="cloud-download"
            label={t('settings.dataScreen.restoreBackup')}
            sub={restoreSub}
            onPress={handlePickRestore}
            disabled={backing || restoring}
          />
        </SettingSection>

        {/* ── Database ─────────────────────────────────────────────────── */}
        <SettingSection title={t('settings.dataScreen.database')}>
          <SettingRow
            icon="pulse"
            label={t('settings.dataScreen.dbHealth')}
            sub={healthSub}
            chevron={false}
            onPress={loadDbStats}
          />
          <SettingRow
            icon="trash"
            label={t('settings.dataScreen.resetApp')}
            sub={t('settings.dataScreen.resetAppSub')}
            destructive
            disabled={resetting}
            rightElement={
              resetting
                ? <ActivityIndicator size="small" color={colors.error} />
                : undefined
            }
            onPress={handleResetApp}
          />
        </SettingSection>

        {/* ── Sync ─────────────────────────────────────────────────────── */}
        <SettingSection title={t('settings.dataScreen.syncSection')}>
          <SettingRow
            icon="sync"
            label={t('settings.dataScreen.syncStatus')}
            sub={t('settings.dataScreen.syncStatusSub')}
            chevron={false}
            onPress={() => {}}
          />
        </SettingSection>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Reset confirmation modal ───────────────────────────────────── */}
      <Modal
        transparent
        visible={showResetModal}
        animationType="fade"
        onRequestClose={handleDismissReset}
        statusBarTranslucent
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <View style={[
            styles.dialog,
            {
              backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
              borderColor:     isDark ? colors.gray200  : 'transparent',
              borderWidth:     isDark ? 1 : 0,
            },
          ]}>
            <View style={[styles.dialogIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="warning" size={28} color="#EF4444" />
            </View>

            <Text style={[styles.dialogTitle, { color: colors.black }]}>
              {t('settings.dataScreen.resetModalTitle')}
            </Text>

            <Text style={[styles.dialogMsg, { color: colors.gray500 }]}>
              {t('settings.dataScreen.resetModalMsg')}
            </Text>

            <TextInput
              style={applyKurdishFont(isKurdish, [
                styles.resetInput,
                {
                  borderColor: resetInput.trim().toUpperCase() === 'RESET'
                    ? colors.error
                    : colors.gray200,
                  color: colors.black,
                  backgroundColor: isDark ? colors.gray50 : colors.gray50,
                },
              ])}
              placeholder={t('settings.dataScreen.resetInputPlaceholder')}
              placeholderTextColor={colors.gray400}
              value={resetInput}
              onChangeText={setResetInput}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!resetting}
            />

            <View style={[styles.dialogBtns, { flexDirection }]}>
              <TouchableOpacity
                style={[styles.btnCancel, { backgroundColor: colors.gray200 }]}
                onPress={handleDismissReset}
                disabled={resetting}
                activeOpacity={0.8}
              >
                <Text style={[styles.btnCancelText, { color: colors.gray600 }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnRestore,
                  {
                    backgroundColor: resetInput.trim().toUpperCase() === 'RESET'
                      ? '#EF4444'
                      : colors.gray300,
                  },
                ]}
                onPress={executeReset}
                disabled={resetting || resetInput.trim().toUpperCase() !== 'RESET'}
                activeOpacity={0.8}
              >
                {resetting
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={styles.btnRestoreText}>{t('settings.dataScreen.resetBtn')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Restore confirmation modal ──────────────────────────────────── */}
      <Modal
        transparent
        visible={showRestoreModal}
        animationType="fade"
        onRequestClose={handleDismissRestore}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <View style={[
            styles.dialog,
            {
              backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
              borderColor:     isDark ? colors.gray200  : 'transparent',
              borderWidth:     isDark ? 1 : 0,
            },
          ]}>
            <View style={[styles.dialogIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="warning" size={28} color="#D97706" />
            </View>

            <Text style={[styles.dialogTitle, { color: colors.black }]}>
              {t('settings.dataScreen.restoreTitle')}
            </Text>

            <Text style={[styles.dialogMsg, { color: colors.gray500 }]}>
              {t('settings.dataScreen.restoreMsg')}
            </Text>

            <View style={[styles.dialogBtns, { flexDirection }]}>
              <TouchableOpacity
                style={[styles.btnCancel, { backgroundColor: colors.gray200 }]}
                onPress={handleDismissRestore}
                disabled={restoring}
                activeOpacity={0.8}
              >
                <Text style={[styles.btnCancelText, { color: colors.gray600 }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnRestore, { backgroundColor: '#D97706' }]}
                onPress={handleConfirmRestore}
                disabled={restoring}
                activeOpacity={0.8}
              >
                {restoring
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={styles.btnRestoreText}>{t('settings.dataScreen.restoreConfirm')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body:      { padding: 16, paddingTop: 8 },

  overlay: {
    flex:              1,
    backgroundColor:   'rgba(0,0,0,0.55)',
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 24,
  },
  dialog: {
    width:         '100%',
    borderRadius:  20,
    padding:       24,
    alignItems:    'center',
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius:  20,
    elevation:     12,
  },
  dialogIconWrap: {
    width:          64,
    height:         64,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   16,
  },
  dialogTitle: {
    fontSize:     18,
    fontWeight:   '700',
    marginBottom:  8,
    textAlign:    'center',
  },
  dialogMsg: {
    fontSize:     14,
    textAlign:    'center',
    lineHeight:   20,
    marginBottom: 24,
  },
  dialogBtns: {
    flexDirection: 'row',
    gap:           12,
    width:         '100%',
  },
  btnCancel: {
    flex:           1,
    height:         48,
    borderRadius:   12,
    alignItems:     'center',
    justifyContent: 'center',
  },
  btnCancelText: { fontSize: 15, fontWeight: '600' },
  btnRestore: {
    flex:           1,
    height:         48,
    borderRadius:   12,
    alignItems:     'center',
    justifyContent: 'center',
  },
  btnRestoreText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  resetInput: {
    width:         '100%',
    height:        48,
    borderWidth:   1.5,
    borderRadius:  12,
    paddingHorizontal: 14,
    fontSize:      15,
    fontWeight:    '600',
    marginBottom:  20,
    textAlign:     'center',
    letterSpacing: 2,
  },
});
