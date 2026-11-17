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
  Switch,
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
import { SettingsBackground } from '@/components/settings/SettingsBackground';
import { useAppTheme } from '@/contexts/ThemeContext';
import { hexToRgba } from '@/lib/colorUtils';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { applyKurdishFont, resolveInputIsKurdish, SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT_REGULAR } from '@/lib/settingsFont';
import { getDatabase, wipeAllBusinessData, saveBusiness } from '@/lib/sqlite';
import {
  exportBackup,
  validateAndParseBackup,
  assertBackupWithinItemLimit,
  performRestore,
  type FroshiarBackup,
  type RestoreSummary,
  type BackupScope,
} from '@/lib/backup';
import { useAuthStore }     from '@/store/authStore';
import { useBusinessStore }  from '@/store/businessStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useSettingsStore }  from '@/store/settingsStore';
import { useLanguageStore }  from '@/store/languageStore';
import { useQuotationStore } from '@/store/quotationStore';
import { useManagementStore } from '@/store/managementStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { useSalesStore } from '@/store/salesStore';
import { usePurchaseStore } from '@/store/purchaseStore';
import { useDebtStore } from '@/store/debtStore';
import { useCustomerStore } from '@/store/customerStore';
import { useSupplierStore } from '@/store/supplierStore';
import { useReportStore } from '@/store/reportStore';
import { useCartStore } from '@/store/cartStore';
import { useCapitalStore } from '@/store/capitalStore';
import { useSavedProductStore } from '@/store/savedProductStore';
import { useOnlineStoreStore } from '@/store/onlineStoreStore';
import * as FileSystem from 'expo-file-system/legacy';
import { isAdminEmail } from '@/lib/adminNotificationService';
import { GoogleDriveDataChart } from '@/components/settings/GoogleDriveDataChart';
import {
  getGoogleDriveConfig,
  connectGoogleDrive,
  disconnectGoogleDrive,
  uploadBackupToGoogleDrive,
  restoreBackupFromGoogleDrive,
  setAutoBackupEnabled,
  fetchGoogleDriveBackupDetails,
  type GoogleDriveConfig,
} from '@/lib/googleDriveBackup';

// Expo Go bundles a fixed set of native modules. Custom modules added to
// package.json (like expo-document-picker) are NOT available there.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

// ─────────────────────────────────────────────────────────────────────────────

export default function DataScreen() {
  const { t }              = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, flexDirection } = useRTL();
  const { contentContainerStyle, horizontalPadding } = useResponsive();
  const router             = useRouter();
  const user               = useAuthStore((s) => s.user);
  const isKuLanguage       = useLanguageStore((s) => s.language === 'ku');
  const isEmployee         = useManagementStore((s) => s.isEmployee);
  const currentEmployeeAccount = useManagementStore((s) => s.currentEmployeeAccount);
  const isAdmin            = isAdminEmail(user?.email);

  const isRealEmployee = Boolean(
    isEmployee &&
    currentEmployeeAccount?.email &&
    user?.email &&
    currentEmployeeAccount.email.trim().toLowerCase() === user.email.trim().toLowerCase() &&
    !isAdmin
  );

  const [backing,          setBacking]          = useState(false);
  const [restoring,        setRestoring]        = useState(false);
  const [resetting,        setResetting]        = useState(false);
  const [showBackupModal,  setShowBackupModal]  = useState(false);
  const [selectedScope,    setSelectedScope]    = useState<BackupScope>('all');
  const [backupStats,      setBackupStats]      = useState({
    products: 0,
    categories: 0,
    sales: 0,
    customers: 0,
    purchases: 0,
    suppliers: 0,
    expenses: 0,
    debts: 0,
    earliestDate: null as string | null,
  });
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showResetModal,   setShowResetModal]   = useState(false);
  const [resetInput,       setResetInput]       = useState('');
  const [resetProgress,    setResetProgress]    = useState<{
    percent: number;
    step: string;
    isComplete?: boolean;
  } | null>(null);
  const [pendingBackup,    setPendingBackup]    = useState<FroshiarBackup | null>(null);
  const [dbRecords,        setDbRecords]        = useState<number | null>(null);
  const [restoreProgress,  setRestoreProgress]  = useState<{ table: string; index: number; total: number } | null>(null);
  const [restoreSummary,   setRestoreSummary]   = useState<RestoreSummary | null>(null);

  // Google Drive state
  const [gdriveConfig,     setGdriveConfig]     = useState<GoogleDriveConfig | null>(null);
  const [gdriveLoading,    setGdriveLoading]    = useState(false);
  const [gdriveSyncing,    setGdriveSyncing]    = useState(false);
  const [gdriveRestoring,  setGdriveRestoring]  = useState(false);

  useEffect(() => {
    void loadDbStats();
    void loadGdriveConfig();
  }, []);

  async function loadGdriveConfig() {
    try {
      const cfg = await getGoogleDriveConfig();
      setGdriveConfig(cfg);
      if (cfg.isConnected && !cfg.backupDetails) {
        fetchGoogleDriveBackupDetails()
          .then((details) => {
            if (details) {
              setGdriveConfig((prev) => (prev ? { ...prev, backupDetails: details } : prev));
            }
          })
          .catch(() => {});
      }
    } catch {
      // Non-fatal
    }
  }

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

  async function handleGDriveRestore() {
    Alert.alert(
      t('settings.dataScreen.googleDriveRestoreConfirmTitle'),
      t('settings.dataScreen.googleDriveRestoreConfirmMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.dataScreen.restoreConfirm'),
          onPress: async () => {
            setGdriveRestoring(true);
            setRestoring(true);
            setRestoreProgress(null);
            setShowRestoreModal(true);
            try {
              const summary = await restoreBackupFromGoogleDrive((event) => {
                setRestoreProgress({ table: event.table, index: event.index, total: event.total });
              });
              await loadDbStats();
              await loadGdriveConfig();
              setRestoreSummary(summary);
            } catch (err: unknown) {
              setShowRestoreModal(false);
              const msg = err instanceof Error ? err.message : '';
              if (msg === 'NO_GDRIVE_BACKUP_FOUND') {
                Alert.alert(t('common.error'), t('settings.dataScreen.googleDriveNoBackupFound'));
              } else if (msg.startsWith('RESTORE_LIMIT_EXCEEDED|')) {
                const [needed, limit] = msg.split('|')[1].split(',');
                Alert.alert(
                  t('settings.dataScreen.restoreLimitExceededTitle'),
                  t('settings.dataScreen.restoreLimitExceededMsg', { needed, limit })
                );
              } else {
                Alert.alert(t('settings.dataScreen.restoreError'), t('settings.dataScreen.restoreErrorMsg'));
              }
            } finally {
              setGdriveRestoring(false);
              setRestoring(false);
              setRestoreProgress(null);
            }
          },
        },
      ]
    );
  }

  async function handleToggleGDriveAuto(val: boolean) {
    await setAutoBackupEnabled(val);
    await loadGdriveConfig();
  }

  async function loadDbStats() {
    try {
      if (Platform.OS === 'web') {
        let total = 0;
        let pCount = 0, catCount = 0, sCount = 0, cCount = 0, purCount = 0, supCount = 0, expCount = 0;
        try {
          const p = typeof localStorage !== 'undefined' ? localStorage.getItem('@froshiar_db_products') : null;
          const cat = typeof localStorage !== 'undefined' ? localStorage.getItem('@froshiar_db_categories') : null;
          const s = typeof localStorage !== 'undefined' ? localStorage.getItem('@froshiar_db_sales') : null;
          const pur = typeof localStorage !== 'undefined' ? localStorage.getItem('@froshiar_db_purchases') : null;
          const c = typeof localStorage !== 'undefined' ? localStorage.getItem('@froshiar_db_customers') : null;
          const sup = typeof localStorage !== 'undefined' ? localStorage.getItem('@froshiar_db_suppliers') : null;
          const exp = typeof localStorage !== 'undefined' ? localStorage.getItem('@froshiar_db_expenses') : null;

          if (p) pCount = (JSON.parse(p) as any[]).length;
          if (cat) catCount = (JSON.parse(cat) as any[]).length;
          if (s) sCount = (JSON.parse(s) as any[]).length;
          if (pur) purCount = (JSON.parse(pur) as any[]).length;
          if (c) cCount = (JSON.parse(c) as any[]).length;
          if (sup) supCount = (JSON.parse(sup) as any[]).length;
          if (exp) expCount = (JSON.parse(exp) as any[]).length;
          total = pCount + sCount + purCount + cCount;
        } catch {}
        setDbRecords(total);
        setBackupStats({
          products: pCount,
          categories: catCount,
          sales: sCount,
          customers: cCount,
          purchases: purCount,
          suppliers: supCount,
          expenses: expCount,
          debts: 0,
          earliestDate: null,
        });
        return;
      }
      const db = await getDatabase();
      const [pRow, catRow, sRow, cRow, purRow, supRow, expRow, debtRow, earliestRow] = await Promise.all([
        db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM products').catch(() => ({ cnt: 0 })),
        db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM categories').catch(() => ({ cnt: 0 })),
        db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM sales').catch(() => ({ cnt: 0 })),
        db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM customers').catch(() => ({ cnt: 0 })),
        db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM purchases').catch(() => ({ cnt: 0 })),
        db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM suppliers').catch(() => ({ cnt: 0 })),
        db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM expenses').catch(() => ({ cnt: 0 })),
        db.getFirstAsync<{ cnt: number }>(
          'SELECT ((SELECT COUNT(*) FROM debts) + (SELECT COUNT(*) FROM purchase_debts)) AS cnt'
        ).catch(() => ({ cnt: 0 })),
        db.getFirstAsync<{ earliest: string }>(
          'SELECT MIN(d) AS earliest FROM (SELECT created_at AS d FROM sales UNION ALL SELECT created_at AS d FROM purchases)'
        ).catch(() => ({ earliest: '' })),
      ]);
      const pCount = pRow?.cnt ?? 0;
      const catCount = catRow?.cnt ?? 0;
      const sCount = sRow?.cnt ?? 0;
      const cCount = cRow?.cnt ?? 0;
      const purCount = purRow?.cnt ?? 0;
      const supCount = supRow?.cnt ?? 0;
      const expCount = expRow?.cnt ?? 0;
      const debtCount = debtRow?.cnt ?? 0;
      const earliest = earliestRow?.earliest ? String(earliestRow.earliest).slice(0, 10) : null;

      setDbRecords(pCount + sCount + purCount + cCount);
      setBackupStats({
        products: pCount,
        categories: catCount,
        sales: sCount,
        customers: cCount,
        purchases: purCount,
        suppliers: supCount,
        expenses: expCount,
        debts: debtCount,
        earliestDate: earliest,
      });
    } catch {
      setDbRecords(0);
    }
  }

  // ── Backup ────────────────────────────────────────────────────────────────
  // expo-sharing is loaded lazily so that a missing native module never crashes
  // the screen at mount time.

  async function handleBackup(scopeToUse?: BackupScope) {
    const scope = scopeToUse ?? selectedScope;
    setShowBackupModal(false);
    setBacking(true);
    try {
      const uri = await exportBackup({ scope });

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
        await assertBackupWithinItemLimit(backup);
        setPendingBackup(backup);
        setShowRestoreModal(true);
      } catch (err: unknown) {
        const code = err instanceof Error ? err.message : '';

        if (code.startsWith('RESTORE_LIMIT_EXCEEDED|')) {
          const [needed, limit] = code.split('|')[1].split(',');
          Alert.alert(
            t('settings.dataScreen.restoreLimitExceededTitle'),
            t('settings.dataScreen.restoreLimitExceededMsg', { needed, limit }),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('settings.upgradeScreen.title'), onPress: () => router.push('/(app)/settings/plan-limits' as never) },
            ]
          );
        } else if (code === 'RESTORE_LIMIT_UNDETERMINED') {
          Alert.alert(
            t('settings.dataScreen.restoreLimitUndeterminedTitle'),
            t('settings.dataScreen.restoreLimitUndeterminedMsg'),
          );
        } else if (code === 'INVALID_JSON' || code === 'INVALID_BACKUP') {
          Alert.alert(
            t('settings.dataScreen.restoreInvalidFile'),
            t('settings.dataScreen.restoreInvalidFileMsg'),
          );
        } else {
          Alert.alert(
            t('settings.dataScreen.restoreError'),
            t('settings.dataScreen.restoreErrorMsg'),
          );
        }
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
    setRestoreProgress(null);
    try {
      const summary = await performRestore(pendingBackup, (event) => {
        if (event.phase === 'table-start') {
          setRestoreProgress({ table: event.table, index: event.tableIndex, total: event.totalTables });
        }
      });

      // Sync the two stores restore actually touched with their freshly merged
      // AsyncStorage values. Theme/language/module layout are never part of a
      // restore, so their stores are left alone.
      await Promise.all([
        useBusinessStore.persist.rehydrate(),
        useSettingsStore.persist.rehydrate(),
        useQuotationStore.persist.rehydrate(),
      ]);

      setPendingBackup(null);
      setRestoreProgress(null);
      setRestoreSummary(summary);
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
    if (restoreSummary) { handleFinishRestore(); return; }
    setShowRestoreModal(false);
    setPendingBackup(null);
  }

  function handleFinishRestore() {
    setShowRestoreModal(false);
    setRestoreSummary(null);
    // Replace the entire navigation stack so every screen remounts and reloads
    // its data from the newly merged SQLite database.
    router.replace('/');
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
    setResetProgress(null);
  }

  async function executeReset() {
    setResetting(true);
    setResetProgress({
      percent: 5,
      step: isKuLanguage ? 'ئامادەکاری بۆ سڕینەوەی داتاکان...' : 'Preparing to reset data...',
    });

    try {
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      // 1. Stop any live Firestore sync & wipe cloud data if user is signed in
      setResetProgress({
        percent: 15,
        step: isKuLanguage ? 'سڕینەوەی بەرهەمەکان و کۆگا...' : 'Wiping products and inventory...',
      });
      await sleep(200);

      try {
        const { stopCloudSync, deleteAllCloudData } = await import('@/lib/cloudSync');
        stopCloudSync();
        if (user?.id) {
          await deleteAllCloudData(user.id).catch(() => {});
        }
      } catch {}

      // 2. Wipe ALL local SQLite tables & sequence counters
      await wipeAllBusinessData();

      // Ensure business profile record is preserved so app layout won't redirect to setup screen
      const currentBiz = useBusinessStore.getState();
      const preservedBizName = currentBiz.name?.trim() || 'فڕۆشیار';
      try {
        await saveBusiness({
          name: preservedBizName,
          type: currentBiz.type || 'General',
          phone: currentBiz.phone || '',
          address: currentBiz.address || '',
          logoPath: undefined,
        });
      } catch {}

      setResetProgress({
        percent: 40,
        step: isKuLanguage ? 'سڕینەوەی فرۆشتن، کڕین و پسوولەکان...' : 'Wiping sales, purchases and invoices...',
      });
      await sleep(250);

      // 3. Wipe all local media files (product photos, logo images, presets, custom banners)
      try {
        if (FileSystem.documentDirectory) {
          const mediaDirs = [
            'product_images',
            'saved_presets',
            'logo_images',
            'supplier_logos',
            'dashboard_banners',
            'header_videos',
            'media',
          ];
          for (const dir of mediaDirs) {
            try {
              await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${dir}/`, { idempotent: true });
            } catch {}
          }
        }
      } catch (e) {
        console.warn('[Reset] Media wipe error:', e);
      }

      setResetProgress({
        percent: 60,
        step: isKuLanguage ? 'سڕینەوەی قەرزەکان، کڕیاران و خەرجییەکان...' : 'Wiping debts, customers and expenses...',
      });
      await sleep(250);

      // 4. Purge all Google Drive backups & disconnect Google Drive
      setResetProgress({
        percent: 78,
        step: isKuLanguage ? 'سڕینەوەی پاشەکەوتەکانی گووگڵ درایڤ و ناچالاککردنی...' : 'Purging Google Drive backups & disconnecting...',
      });
      try {
        const { purgeGoogleDriveBackupsAndDisconnect } = await import('@/lib/googleDriveBackup');
        await purgeGoogleDriveBackupsAndDisconnect();
      } catch (e) {
        console.warn('[Reset] GDrive purge error:', e);
      }
      setGdriveConfig(null);
      await sleep(200);

      // 5. Clean AsyncStorage preserving auth, settings, language, business, and onboarding
      setResetProgress({
        percent: 88,
        step: isKuLanguage ? 'نوێکردنەوەی پاشەکەوتە ناوخۆییەکان...' : 'Resetting local stores...',
      });

      try {
        const PRESERVED_KEYS = new Set([
          '@froshiar_auth',
          '@froshiar_business',
          '@froshiar_settings',
          '@froshiar_language',
          '@froshiar_onboarding',
        ]);
        const allKeys = await AsyncStorage.getAllKeys();
        const keysToRemove = allKeys.filter((k) => !PRESERVED_KEYS.has(k));
        if (keysToRemove.length > 0) {
          await AsyncStorage.multiRemove(keysToRemove);
        }
      } catch (e) {
        console.warn('[Reset] AsyncStorage multiRemove error:', e);
      }

      // 6. Reset all in-memory Zustand stores immediately so every screen is zeroed out
      try {
        useBusinessStore.setState({
          logoUri: null,
          isSetupComplete: true,
          showOnDashboard: false,
        });
        useOnboardingStore.getState().completeOnboarding();
        useInventoryStore.setState({
          products: [],
          stats: null,
          categories: ['گشتی'],
          managedCategories: [{ name: 'گشتی', productCount: 0, isDefault: true }],
          inventoryHistory: [],
        });
        useSalesStore.setState({ sales: [], saleItemsIndex: {} });
        usePurchaseStore.setState({ purchases: [] });
        useDebtStore.setState({ salesDebts: [], purchaseDebts: [], summary: null });
        useCustomerStore.setState({ customers: [] });
        useSupplierStore.setState({ suppliers: [] });
        useReportStore.setState({
          financialCards: null,
          salesData: null,
          purchaseData: null,
          plData: null,
          inventoryData: null,
          debtData: null,
          installmentData: null,
          topProfitable: [],
          monthlyRevenue: [],
          expenses: [],
          cashBalance: null,
          dashboardExpenseTotals: null,
        });
        useCartStore.getState().clearCart();
        useQuotationStore.setState({ quotations: [] });
        useCapitalStore.setState({ isEnabled: false, initialCapital: 0, activatedAt: null, deposits: [] });
        useSavedProductStore.setState({ savedPresets: [] });
        await useOnlineStoreStore.getState().resetStoreState();
      } catch (e) {
        console.warn('[Reset] Store reset error:', e);
      }

      // Refresh stats on the current screen so counts immediately update to 0
      await loadDbStats();
      await loadGdriveConfig();

      // 7. Reached 100% complete
      setResetProgress({
        percent: 100,
        step: isKuLanguage
          ? 'هەموو داتاکان بە سەرکەوتوویی سفر کرانەوە!'
          : 'All data successfully reset to zero!',
        isComplete: true,
      });

      await sleep(1200);

      // Close modal and keep user on screen (DO NOT LOG OUT)
      setShowResetModal(false);
      setResetting(false);
      setResetProgress(null);
      setResetInput('');

      Alert.alert(
        isKuLanguage ? 'سفرکردنەوەی سەرکەوتوو' : 'Reset Successful',
        isKuLanguage
          ? 'هەموو داتاکانی کۆگا، فرۆشتن، کڕین و پسوولەکان بە سەرکەوتوویی سفر کرانەوە و گووگڵ درایڤ ناچالاک کرا.'
          : 'All inventory, sales, purchases, and invoices were reset to zero, and Google Drive was disconnected.'
      );
    } catch (err) {
      console.error('[Reset] Execution failed:', err);
      Alert.alert(t('common.error'), t('common.tryAgain'));
      setResetting(false);
      setResetProgress(null);
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

  const IS_IOS = Platform.OS === 'ios';

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <SettingsBackground />
      <AppHeader title={t('settings.dataScreen.title')} showBack />

      <ScrollView
        contentContainerStyle={[
          styles.body,
          contentContainerStyle,
          { paddingHorizontal: horizontalPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Google Drive Personal Cloud Backup (Managers / Owners Only) ── */}
        {!isRealEmployee && (
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
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={[
                  styles.gdriveShieldWrap,
                  { backgroundColor: hexToRgba(colors.primary, isDark ? 0.22 : 0.14) },
                ]}
              >
                <Ionicons name="shield-checkmark" size={17} color={colors.primary} />
              </View>
              <Text
                style={[
                  styles.gdriveBannerText,
                  {
                    color: isDark ? colors.primary : colors.black,
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {t('settings.dataScreen.googleDrivePrivacyBadge')}
              </Text>
            </View>
          </View>

          <SettingRow
            icon="logo-google"
            color="#4285F4"
            label={
              gdriveConfig?.isConnected
                ? (gdriveConfig.email ?? t('settings.dataScreen.googleDriveConnected'))
                : (isKuLanguage ? 'گووگڵ درایڤ' : 'Google Drive')
            }
            sub={
              gdriveConfig?.isConnected
                ? t('settings.dataScreen.googleDriveConnected')
                : t('settings.dataScreen.googleDriveNotConnected')
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
                  activeOpacity={0.75}
                  style={[
                    styles.gdriveActionBtn,
                    {
                      backgroundColor: gdriveConfig?.isConnected
                        ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2')
                        : colors.primary,
                      borderColor: gdriveConfig?.isConnected
                        ? (isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA')
                        : colors.primary,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <Ionicons
                    name={gdriveConfig?.isConnected ? 'close-circle-outline' : 'link-outline'}
                    size={14}
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

          {gdriveConfig?.isConnected ? (
            <GoogleDriveDataChart
              config={gdriveConfig}
              localStats={backupStats}
              onBackupNow={handleGDriveBackup}
              onRestoreNow={handleGDriveRestore}
              isSyncing={gdriveSyncing}
              isRestoring={gdriveRestoring}
            />
          ) : null}

          {gdriveConfig?.isConnected ? (
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
          ) : null}
        </SettingSection>
        )}

        {/* ── Backup & Restore ─────────────────────────────────────────── */}
        <SettingSection title={t('settings.dataScreen.backupRestore')}>
          <SettingRow
            icon="cloud-upload"
            label={t('settings.dataScreen.backupData')}
            sub={t('settings.dataScreen.backupDataSub')}
            onPress={() => {
              void loadDbStats();
              setShowBackupModal(true);
            }}
            disabled={backing || restoring}
            rightElement={
              backing
                ? <ActivityIndicator size="small" color={colors.primary} />
                : undefined
            }
          />
          {!isRealEmployee && (
            <SettingRow
              icon="cloud-download"
              label={t('settings.dataScreen.restoreBackup')}
              sub={restoreSub}
              onPress={handlePickRestore}
              disabled={backing || restoring}
            />
          )}
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
          {!isRealEmployee && (
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
          )}
        </SettingSection>

        {/* ── Sync ─────────────────────────────────────────────────────── */}
        <SettingSection title={t('settings.dataScreen.syncSection')}>
          <SettingRow
            icon="sync"
            label={t('settings.dataScreen.syncStatus')}
            sub={t('settings.dataScreen.syncStatusSub')}
            onPress={() => router.push('/(app)/settings/cloud-sync' as never)}
          />
        </SettingSection>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Backup Scope Selection Modal ───────────────────────────────── */}
      <Modal
        transparent
        visible={showBackupModal}
        animationType="fade"
        onRequestClose={() => setShowBackupModal(false)}
        statusBarTranslucent
        supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
      >
        <View style={styles.overlay}>
          <View style={[
            styles.dialog,
            styles.backupScopeDialog,
            IS_IOS && styles.glassDialog,
            {
              backgroundColor: IS_IOS
                ? (isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)')
                : (isDark ? colors.gray100 : '#FFFFFF'),
              borderColor: IS_IOS
                ? (isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(255, 255, 255, 0.85)')
                : (isDark ? colors.gray200 : 'transparent'),
              borderWidth: IS_IOS ? 1.2 : (isDark ? 1 : 0),
            },
          ]}>
            <View style={[styles.dialogIconWrap, { backgroundColor: isDark ? hexToRgba(colors.primary, 0.20) : hexToRgba(colors.primary, 0.12) }]}>
              <Ionicons name="cloud-upload" size={28} color={colors.primary} />
            </View>

            <Text style={[styles.dialogTitle, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }, { color: colors.black }]}>
              {t('settings.dataScreen.backupScopeTitle')}
            </Text>

            <Text style={[styles.dialogMsg, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR }, { color: colors.gray500, marginBottom: 14 }]}>
              {t('settings.dataScreen.backupScopeSub')}
            </Text>

            <ScrollView style={{ width: '100%', maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10, width: '100%', paddingBottom: 6 }}>
                {/* 1. All Data */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedScope('all')}
                  style={[
                    styles.scopeOptionCard,
                    {
                      borderColor: selectedScope === 'all' ? colors.primary : (isDark ? colors.gray200 : colors.gray200),
                      borderWidth: selectedScope === 'all' ? 2 : 1,
                      backgroundColor: selectedScope === 'all'
                        ? (isDark ? hexToRgba(colors.primary, 0.18) : hexToRgba(colors.primary, 0.08))
                        : (isDark ? colors.gray50 : colors.gray50),
                      flexDirection,
                    },
                  ]}
                >
                  <View style={[styles.scopeIconBox, { backgroundColor: isDark ? hexToRgba(colors.primary, 0.20) : hexToRgba(colors.primary, 0.12) }]}>
                    <Ionicons name="layers-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <View style={{ flexDirection, alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[styles.scopeTitle, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }, { color: colors.black }]}>
                        {t('settings.dataScreen.backupScopeAll')}
                      </Text>
                      <View style={[styles.scopeBadge, { backgroundColor: isDark ? hexToRgba(colors.primary, 0.25) : hexToRgba(colors.primary, 0.15) }]}>
                        <Text style={[styles.scopeBadgeText, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }, { color: colors.primary }]}>
                          {t('settings.dataScreen.backupScopeAllBadge')}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.scopeSub, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR }, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t('settings.dataScreen.backupScopeAllSub')}
                    </Text>
                  </View>
                  <Ionicons
                    name={selectedScope === 'all' ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selectedScope === 'all' ? colors.primary : colors.gray400}
                  />
                </TouchableOpacity>

                {/* 2. Sales & Customers */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedScope('sales_customers')}
                  style={[
                    styles.scopeOptionCard,
                    {
                      borderColor: selectedScope === 'sales_customers' ? colors.primary : (isDark ? colors.gray200 : colors.gray200),
                      borderWidth: selectedScope === 'sales_customers' ? 2 : 1,
                      backgroundColor: selectedScope === 'sales_customers'
                        ? (isDark ? hexToRgba(colors.primary, 0.18) : hexToRgba(colors.primary, 0.08))
                        : (isDark ? colors.gray50 : colors.gray50),
                      flexDirection,
                    },
                  ]}
                >
                  <View style={[styles.scopeIconBox, { backgroundColor: isDark ? hexToRgba(colors.primary, 0.20) : hexToRgba(colors.primary, 0.12) }]}>
                    <Ionicons name="cart-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <View style={{ flexDirection, alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[styles.scopeTitle, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }, { color: colors.black }]}>
                        {t('settings.dataScreen.backupScopeSales')}
                      </Text>
                      <View style={[styles.scopeBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.20)' : '#EFF6FF' }]}>
                        <Text style={[styles.scopeBadgeText, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR }, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
                          {t('settings.dataScreen.backupSalesBadge', { sales: backupStats.sales, customers: backupStats.customers })}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.scopeSub, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR }, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t('settings.dataScreen.backupScopeSalesSub')}
                    </Text>
                  </View>
                  <Ionicons
                    name={selectedScope === 'sales_customers' ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selectedScope === 'sales_customers' ? colors.primary : colors.gray400}
                  />
                </TouchableOpacity>

                {/* 3. Inventory & Products */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedScope('inventory')}
                  style={[
                    styles.scopeOptionCard,
                    {
                      borderColor: selectedScope === 'inventory' ? colors.primary : (isDark ? colors.gray200 : colors.gray200),
                      borderWidth: selectedScope === 'inventory' ? 2 : 1,
                      backgroundColor: selectedScope === 'inventory'
                        ? (isDark ? hexToRgba(colors.primary, 0.18) : hexToRgba(colors.primary, 0.08))
                        : (isDark ? colors.gray50 : colors.gray50),
                      flexDirection,
                    },
                  ]}
                >
                  <View style={[styles.scopeIconBox, { backgroundColor: isDark ? hexToRgba(colors.primary, 0.20) : hexToRgba(colors.primary, 0.12) }]}>
                    <Ionicons name="cube-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <View style={{ flexDirection, alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[styles.scopeTitle, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }, { color: colors.black }]}>
                        {t('settings.dataScreen.backupScopeInventory')}
                      </Text>
                      <View style={[styles.scopeBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.20)' : '#ECFDF5' }]}>
                        <Text style={[styles.scopeBadgeText, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR }, { color: isDark ? '#34D399' : '#059669' }]}>
                          {t('settings.dataScreen.backupInventoryBadge', { products: backupStats.products, categories: backupStats.categories })}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.scopeSub, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR }, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t('settings.dataScreen.backupScopeInventorySub')}
                    </Text>
                  </View>
                  <Ionicons
                    name={selectedScope === 'inventory' ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selectedScope === 'inventory' ? colors.primary : colors.gray400}
                  />
                </TouchableOpacity>

                {/* 4. Purchases & Suppliers */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedScope('purchases_suppliers')}
                  style={[
                    styles.scopeOptionCard,
                    {
                      borderColor: selectedScope === 'purchases_suppliers' ? colors.primary : (isDark ? colors.gray200 : colors.gray200),
                      borderWidth: selectedScope === 'purchases_suppliers' ? 2 : 1,
                      backgroundColor: selectedScope === 'purchases_suppliers'
                        ? (isDark ? hexToRgba(colors.primary, 0.18) : hexToRgba(colors.primary, 0.08))
                        : (isDark ? colors.gray50 : colors.gray50),
                      flexDirection,
                    },
                  ]}
                >
                  <View style={[styles.scopeIconBox, { backgroundColor: isDark ? hexToRgba(colors.primary, 0.20) : hexToRgba(colors.primary, 0.12) }]}>
                    <Ionicons name="bag-handle-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <View style={{ flexDirection, alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[styles.scopeTitle, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }, { color: colors.black }]}>
                        {t('settings.dataScreen.backupScopePurchases')}
                      </Text>
                      <View style={[styles.scopeBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.20)' : '#FFFBEB' }]}>
                        <Text style={[styles.scopeBadgeText, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR }, { color: isDark ? '#FBBF24' : '#D97706' }]}>
                          {t('settings.dataScreen.backupPurchasesBadge', { purchases: backupStats.purchases, suppliers: backupStats.suppliers })}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.scopeSub, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR }, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t('settings.dataScreen.backupScopePurchasesSub')}
                    </Text>
                  </View>
                  <Ionicons
                    name={selectedScope === 'purchases_suppliers' ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selectedScope === 'purchases_suppliers' ? colors.primary : colors.gray400}
                  />
                </TouchableOpacity>

                {/* 5. Dashboard & Financials */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedScope('dashboard_financial')}
                  style={[
                    styles.scopeOptionCard,
                    {
                      borderColor: selectedScope === 'dashboard_financial' ? colors.primary : (isDark ? colors.gray200 : colors.gray200),
                      borderWidth: selectedScope === 'dashboard_financial' ? 2 : 1,
                      backgroundColor: selectedScope === 'dashboard_financial'
                        ? (isDark ? hexToRgba(colors.primary, 0.18) : hexToRgba(colors.primary, 0.08))
                        : (isDark ? colors.gray50 : colors.gray50),
                      flexDirection,
                    },
                  ]}
                >
                  <View style={[styles.scopeIconBox, { backgroundColor: isDark ? hexToRgba(colors.primary, 0.20) : hexToRgba(colors.primary, 0.12) }]}>
                    <Ionicons name="pie-chart-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <View style={{ flexDirection, alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[styles.scopeTitle, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }, { color: colors.black }]}>
                        {t('settings.dataScreen.backupScopeDashboard')}
                      </Text>
                      <View style={[styles.scopeBadge, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.20)' : '#FAF5FF' }]}>
                        <Text style={[styles.scopeBadgeText, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR }, { color: isDark ? '#C084FC' : '#9333EA' }]}>
                          {t('settings.dataScreen.backupDashboardBadge', { expenses: backupStats.expenses })}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.scopeSub, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR }, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t('settings.dataScreen.backupScopeDashboardSub')}
                    </Text>
                  </View>
                  <Ionicons
                    name={selectedScope === 'dashboard_financial' ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selectedScope === 'dashboard_financial' ? colors.primary : colors.gray400}
                  />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={[styles.dialogBtns, { flexDirection, marginTop: 14 }]}>
              <TouchableOpacity
                style={[styles.btnCancel, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
                onPress={() => setShowBackupModal(false)}
                disabled={backing}
              >
                <Text style={[styles.btnCancelText, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR }, { color: colors.gray600 }]}>
                  {t('settings.dataScreen.backupCancelBtn')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnRestore, { backgroundColor: colors.primary }]}
                onPress={() => handleBackup(selectedScope)}
                disabled={backing}
              >
                {backing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.btnRestoreText, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {t('settings.dataScreen.backupStartBtn')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Reset confirmation modal ───────────────────────────────────── */}
      <Modal
        transparent
        visible={showResetModal}
        animationType="fade"
        onRequestClose={handleDismissReset}
        statusBarTranslucent
        supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <View style={[
            styles.dialog,
            IS_IOS && styles.glassDialog,
            {
              backgroundColor: IS_IOS
                ? (isDark ? 'rgba(30, 41, 59, 0.88)' : 'rgba(255, 255, 255, 0.90)')
                : (isDark ? colors.gray100 : '#FFFFFF'),
              borderColor: IS_IOS
                ? (isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(255, 255, 255, 0.85)')
                : (isDark ? colors.gray200 : 'transparent'),
              borderWidth: IS_IOS ? 1.2 : (isDark ? 1 : 0),
            },
          ]}>
            {resetProgress ? (
              <View style={{ width: '100%', alignItems: 'center', paddingVertical: 10 }}>
                <View
                  style={[
                    styles.dialogIconWrap,
                    {
                      backgroundColor: resetProgress.isComplete
                        ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7')
                        : (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2'),
                      marginBottom: 16,
                    },
                  ]}
                >
                  <Ionicons
                    name={resetProgress.isComplete ? 'checkmark-circle' : 'trash-bin'}
                    size={32}
                    color={resetProgress.isComplete ? '#10B981' : '#EF4444'}
                  />
                </View>

                <Text
                  style={[
                    styles.dialogTitle,
                    { color: colors.black, textAlign: 'center', marginBottom: 8 },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {resetProgress.isComplete
                    ? (isKuLanguage ? 'سفرکردنەوە تەواو بوو!' : 'Reset Complete!')
                    : (isKuLanguage ? 'سڕینەوە و سفرکردنەوەی داتاکان...' : 'Resetting All Data...')}
                </Text>

                <Text
                  style={[
                    styles.dialogMsg,
                    { color: colors.gray500, textAlign: 'center', marginBottom: 20 },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                  ]}
                >
                  {resetProgress.step}
                </Text>

                {/* Progress Bar Container */}
                <View
                  style={{
                    width: '100%',
                    height: 12,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
                    borderRadius: 6,
                    overflow: 'hidden',
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${resetProgress.percent}%`,
                      backgroundColor: resetProgress.isComplete ? '#10B981' : '#EF4444',
                      borderRadius: 6,
                    }}
                  />
                </View>

                {/* Percentage Display */}
                <Text
                  style={[
                    {
                      color: resetProgress.isComplete ? '#10B981' : '#EF4444',
                      fontSize: 18,
                      fontWeight: '700',
                    },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {resetProgress.percent}%
                </Text>
              </View>
            ) : (
              <>
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
                  style={applyKurdishFont(
                    resolveInputIsKurdish({ isKuLanguage, value: resetInput, placeholder: t('settings.dataScreen.resetInputPlaceholder') }),
                    [
                      styles.resetInput,
                      {
                        borderColor: resetInput.trim().toUpperCase() === 'RESET'
                          ? colors.error
                          : colors.gray200,
                        color: colors.black,
                        backgroundColor: isDark ? colors.gray50 : colors.gray50,
                      },
                    ]
                  )}
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
                    <Text style={styles.btnRestoreText}>{t('settings.dataScreen.resetBtn')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
        supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
      >
        <View style={styles.overlay}>
          <View style={[
            styles.dialog,
            IS_IOS && styles.glassDialog,
            {
              backgroundColor: IS_IOS
                ? (isDark ? 'rgba(30, 41, 59, 0.88)' : 'rgba(255, 255, 255, 0.90)')
                : (isDark ? colors.gray100 : '#FFFFFF'),
              borderColor: IS_IOS
                ? (isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(255, 255, 255, 0.85)')
                : (isDark ? colors.gray200 : 'transparent'),
              borderWidth: IS_IOS ? 1.2 : (isDark ? 1 : 0),
            },
          ]}>
            {restoreSummary ? (
              <>
                <View style={[styles.dialogIconWrap, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="checkmark-circle" size={28} color="#16A34A" />
                </View>

                <Text style={[styles.dialogTitle, { color: colors.black }]}>
                  {t('settings.dataScreen.restoreSummaryTitle')}
                </Text>

                <Text style={[styles.dialogMsg, { color: colors.gray500 }]}>
                  {t('settings.dataScreen.restoreSummaryBody', {
                    inserted: restoreSummary.inserted,
                    updated:  restoreSummary.updated,
                    skipped:  restoreSummary.skipped,
                  })}
                </Text>

                {restoreSummary.warnings.length > 0 && (
                  <View style={styles.warningsBox}>
                    <Text style={[styles.warningsTitle, { color: colors.gray600 }]}>
                      {t('settings.dataScreen.restoreSummaryWarningsTitle')}
                    </Text>
                    {restoreSummary.warnings.map((warning, i) => (
                      <Text key={i} style={[styles.warningsItem, { color: colors.gray500 }]}>
                        {'• '}{warning}
                      </Text>
                    ))}
                  </View>
                )}

                <View style={[styles.dialogBtns, { flexDirection }]}>
                  <TouchableOpacity
                    style={[styles.btnRestore, { backgroundColor: colors.primary, flex: 1 }]}
                    onPress={handleFinishRestore}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnRestoreText}>{t('settings.dataScreen.restoreDone')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.dialogIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="warning" size={28} color="#D97706" />
                </View>

                <Text style={[styles.dialogTitle, { color: colors.black }]}>
                  {t('settings.dataScreen.restoreTitle')}
                </Text>

                <Text style={[styles.dialogMsg, { color: colors.gray500 }]}>
                  {restoring
                    ? (restoreProgress
                        ? t('settings.dataScreen.restoreProgressLabel', {
                            table: restoreProgress.table.replace(/_/g, ' '),
                            index: restoreProgress.index,
                            total: restoreProgress.total,
                          })
                        : (isKuLanguage ? 'داگرتن و پشکنینی پاشەکەوت… تکایە کەمێک چاوەڕێبە' : 'Downloading & verifying backup… please wait'))
                    : t('settings.dataScreen.restoreMsg')}
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
              </>
            )}
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
  glassDialog: {
    borderWidth: 1.2,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
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
  warningsBox: {
    width:         '100%',
    marginBottom:  20,
    gap:           4,
  },
  warningsTitle: {
    fontSize:     13,
    fontWeight:   '700',
    marginBottom: 4,
  },
  warningsItem: {
    fontSize:   13,
    lineHeight: 18,
  },
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
  gdriveBanner: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  gdriveShieldWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gdriveBannerText: {
    fontSize: 12.5,
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
    flex: 1,
    lineHeight: 20,
    includeFontPadding: false,
  },
  gdriveActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    gap: 4,
    borderWidth: 1,
  },
  gdriveActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    includeFontPadding: false,
  },
  backupScopeDialog: {
    maxWidth: 520,
    maxHeight: '90%',
  },
  scopeOptionCard: {
    width: '100%',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    gap: 12,
  },
  scopeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  scopeSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  scopeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scopeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
