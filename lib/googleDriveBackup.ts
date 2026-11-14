/**
 * Google Drive Backup & Restore Module for Froshiar.
 *
 * Saves customer database and settings directly to their personal Google Drive.
 * Zero data is stored on external or developer servers.
 * Universal support: Android, iOS, Windows Desktop (Electron), and Web.
 *
 * Scope: drive.file (safe, restricted scope strictly accessing files created by Froshiar).
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  generateBackupData,
  validateAndParseBackupContent,
  assertBackupWithinItemLimit,
  performRestore,
  type RestoreSummary,
} from '@/lib/backup';
import { useBusinessStore } from '@/store/businessStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useQuotationStore } from '@/store/quotationStore';

const WEB_CLIENT_ID =
  '1097351210121-glmjp9ul4vfa45hhsvemnmmpajff8eh6.apps.googleusercontent.com';

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
  'email',
  'profile',
  'openid',
];

const GDRIVE_CONFIG_KEY = '@froshiar_gdrive_config';
const GDRIVE_WEB_TOKEN_KEY = '@froshiar_gdrive_web_token';
const BACKUP_FILENAME = 'froshiar_backup.json';
const AUTO_BACKUP_COOLDOWN_MS = 45 * 1000; // 45 seconds debounce between auto-saves

export interface GoogleDriveBackupDetails {
  totalRecords: number;
  productsCount: number;
  salesCount: number;
  purchasesCount: number;
  customersCount: number;
  suppliersCount: number;
  debtsCount: number;
  expensesCount: number;
  mediaCount: number;
  dataStartDate: string | null;
  platform: string | null;
  appVersion: string | null;
  createdAt: string | null;
  modifiedAt: string | null;
  sizeBytes: number;
}

export interface GoogleDriveConfig {
  isConnected: boolean;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  lastBackupAt: string | null;
  lastBackupSize: number | null;
  autoBackupEnabled: boolean;
  backupDetails?: GoogleDriveBackupDetails | null;
}

const DEFAULT_CONFIG: GoogleDriveConfig = {
  isConnected: false,
  email: null,
  displayName: null,
  photoUrl: null,
  lastBackupAt: null,
  lastBackupSize: null,
  autoBackupEnabled: true,
  backupDetails: null,
};

let lastAutoBackupAttempt = 0;
let isBackupInProgress = false;

// ─── Native Module Helper ───────────────────────────────────────────────────

let googleSigninConfigured = false;
async function getGoogleSignin() {
  const { GoogleSignin } = await import(
    '@react-native-google-signin/google-signin'
  );
  if (!googleSigninConfigured) {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.appdata',
      ],
    });
    googleSigninConfigured = true;
  }
  return GoogleSignin;
}

// ─── Web Browser GIS Helper ─────────────────────────────────────────────────

function connectGoogleDriveWebBrowser(): Promise<{
  accessToken: string;
  user: { email?: string | null; displayName?: string | null; photoUrl?: string | null };
}> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return reject(new Error('Window or DOM not available'));
    }

    const loadGis = () => {
      return new Promise<void>((res, rej) => {
        if ((window as any).google?.accounts?.oauth2) {
          return res();
        }
        const existing = document.getElementById('google-gsi-client');
        if (existing) {
          existing.addEventListener('load', () => res());
          return;
        }
        const script = document.createElement('script');
        script.id = 'google-gsi-client';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => res();
        script.onerror = () => rej(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
      });
    };

    loadGis()
      .then(() => {
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: WEB_CLIENT_ID,
          scope: DRIVE_SCOPES.join(' '),
          callback: async (resp: any) => {
            if (resp.error) {
              if (resp.error === 'access_denied') {
                return reject(new Error('SIGN_IN_CANCELLED'));
              }
              return reject(new Error(resp.error_description || resp.error));
            }
            if (resp.access_token) {
              try {
                const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${resp.access_token}` },
                });
                const u = await userRes.json();
                return resolve({
                  accessToken: resp.access_token,
                  user: {
                    email: u.email || null,
                    displayName: u.name || null,
                    photoUrl: u.picture || null,
                  },
                });
              } catch {
                return resolve({
                  accessToken: resp.access_token,
                  user: { email: null, displayName: null, photoUrl: null },
                });
              }
            }
            reject(new Error('GDRIVE_TOKEN_ERROR'));
          },
        });
        tokenClient.requestAccessToken({ prompt: 'consent' });
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// ─── Config Persistence ─────────────────────────────────────────────────────

export async function getGoogleDriveConfig(): Promise<GoogleDriveConfig> {
  try {
    const raw = await AsyncStorage.getItem(GDRIVE_CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveGoogleDriveConfig(
  updates: Partial<GoogleDriveConfig>
): Promise<GoogleDriveConfig> {
  const current = await getGoogleDriveConfig();
  const next = { ...current, ...updates };
  await AsyncStorage.setItem(GDRIVE_CONFIG_KEY, JSON.stringify(next));
  return next;
}

export async function setAutoBackupEnabled(enabled: boolean): Promise<void> {
  await saveGoogleDriveConfig({ autoBackupEnabled: enabled });
}

// ─── Authentication & Token Management ─────────────────────────────────────

async function getValidAccessToken(): Promise<string> {
  if (Platform.OS === 'web') {
    const stored = await AsyncStorage.getItem(GDRIVE_WEB_TOKEN_KEY);
    if (stored) {
      try {
        const testRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${stored}` },
        });
        if (testRes.ok) {
          return stored;
        }
      } catch {
        // Token check failed
      }
    }

    // Attempt Desktop reconnect if available
    const desktopAPI = typeof window !== 'undefined' ? (window as any).desktopAPI : null;
    if (desktopAPI && typeof desktopAPI.connectGoogleDrive === 'function') {
      const res = await desktopAPI.connectGoogleDrive();
      if (res?.success && res?.accessToken) {
        await AsyncStorage.setItem(GDRIVE_WEB_TOKEN_KEY, res.accessToken);
        if (res.email) {
          await saveGoogleDriveConfig({
            isConnected: true,
            email: res.email,
            displayName: res.displayName,
            photoUrl: res.photoUrl,
          });
        }
        return res.accessToken;
      }
    }

    throw new Error('GDRIVE_AUTH_REQUIRED');
  }

  // Native iOS / Android
  const GoogleSignin = await getGoogleSignin();

  try {
    const tokens = await GoogleSignin.getTokens();
    if (tokens?.accessToken) {
      return tokens.accessToken;
    }
  } catch {
    // Access token expired or missing — fall through to silent refresh
  }

  try {
    await GoogleSignin.signInSilently();
    const tokens = await GoogleSignin.getTokens();
    if (tokens?.accessToken) {
      return tokens.accessToken;
    }
  } catch {
    throw new Error('GDRIVE_AUTH_REQUIRED');
  }

  throw new Error('GDRIVE_AUTH_REQUIRED');
}

/**
 * Connect user's Google Drive account.
 */
export async function connectGoogleDrive(): Promise<GoogleDriveConfig> {
  let accessToken: string | null = null;
  let user: { email?: string | null; displayName?: string | null; photoUrl?: string | null } = {};

  if (Platform.OS === 'web') {
    const desktopAPI = typeof window !== 'undefined' ? (window as any).desktopAPI : null;
    if (desktopAPI && typeof desktopAPI.connectGoogleDrive === 'function') {
      const res = await desktopAPI.connectGoogleDrive();
      if (res?.cancelled) {
        throw new Error('SIGN_IN_CANCELLED');
      }
      if (!res?.success || !res?.accessToken) {
        throw new Error(res?.error || 'GDRIVE_TOKEN_ERROR');
      }
      accessToken = res.accessToken;
      user = {
        email: res.email || null,
        displayName: res.displayName || null,
        photoUrl: res.photoUrl || null,
      };
    } else {
      const webAuth = await connectGoogleDriveWebBrowser();
      accessToken = webAuth.accessToken;
      user = webAuth.user;
    }

    if (!accessToken) {
      throw new Error('GDRIVE_TOKEN_ERROR');
    }

    await AsyncStorage.setItem(GDRIVE_WEB_TOKEN_KEY, accessToken);
  } else {
    // Native mobile (Android / iOS)
    const GoogleSignin = await getGoogleSignin();

    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const signInResult = await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();

    if (!tokens?.accessToken) {
      throw new Error('GDRIVE_TOKEN_ERROR');
    }

    accessToken = tokens.accessToken;
    const u = signInResult.data?.user;
    user = {
      email: u?.email ?? null,
      displayName: u?.name ?? null,
      photoUrl: u?.photo ?? null,
    };
  }

  const config = await saveGoogleDriveConfig({
    isConnected: true,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoUrl: user.photoUrl ?? null,
    autoBackupEnabled: true,
  });

  // Query if an existing backup already exists on Drive
  try {
    const existing = await findBackupFileOnDrive(accessToken);
    if (existing) {
      await saveGoogleDriveConfig({
        lastBackupAt: existing.modifiedTime ?? null,
        lastBackupSize: existing.size ? parseInt(existing.size, 10) : null,
      });
    }
  } catch {
    // Non-fatal
  }

  return config;
}

/**
 * Disconnect Google Drive account.
 */
export async function disconnectGoogleDrive(): Promise<void> {
  if (Platform.OS === 'web') {
    const token = await AsyncStorage.getItem(GDRIVE_WEB_TOKEN_KEY);
    if (token) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: 'POST' }).catch(() => {});
      await AsyncStorage.removeItem(GDRIVE_WEB_TOKEN_KEY);
    }
  } else {
    try {
      const GoogleSignin = await getGoogleSignin();
      await GoogleSignin.signOut().catch(() => {});
    } catch {
      // Native module might be unbundled
    }
  }

  await saveGoogleDriveConfig({
    isConnected: false,
    email: null,
    displayName: null,
    photoUrl: null,
    lastBackupAt: null,
    lastBackupSize: null,
  });
}

// ─── Google Drive REST API Calls ───────────────────────────────────────────

export interface DriveFileRecord {
  id: string;
  name: string;
  modifiedTime?: string;
  createdTime?: string;
  size?: string;
  properties?: Record<string, string>;
  description?: string;
}

export async function findBackupFileOnDrive(
  accessToken: string
): Promise<DriveFileRecord | null> {
  const query = encodeURIComponent(
    `name = '${BACKUP_FILENAME}' and trashed = false`
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&orderBy=modifiedTime%20desc&fields=files(id,name,modifiedTime,createdTime,size,description,properties)`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('GDRIVE_AUTH_REQUIRED');
    throw new Error(`GDRIVE_QUERY_FAILED_${res.status}`);
  }

  const json = await res.json();
  const files: DriveFileRecord[] = json.files ?? [];
  return files.length > 0 ? files[0] : null;
}

export async function fetchGoogleDriveBackupDetails(): Promise<GoogleDriveBackupDetails | null> {
  try {
    const accessToken = await getValidAccessToken();
    const existing = await findBackupFileOnDrive(accessToken);
    if (!existing) return null;

    const props = existing.properties || {};
    const sizeBytes = existing.size ? parseInt(existing.size, 10) : 0;

    const details: GoogleDriveBackupDetails = {
      totalRecords: parseInt(props.totalRecords || '0', 10) || 0,
      productsCount: parseInt(props.productsCount || '0', 10) || 0,
      salesCount: parseInt(props.salesCount || '0', 10) || 0,
      purchasesCount: parseInt(props.purchasesCount || '0', 10) || 0,
      customersCount: parseInt(props.customersCount || '0', 10) || 0,
      suppliersCount: parseInt(props.suppliersCount || '0', 10) || 0,
      debtsCount: parseInt(props.debtsCount || '0', 10) || 0,
      expensesCount: parseInt(props.expensesCount || '0', 10) || 0,
      mediaCount: parseInt(props.mediaCount || '0', 10) || 0,
      dataStartDate: props.dataStartDate || null,
      platform: props.platform || null,
      appVersion: props.appVersion || null,
      createdAt: existing.createdTime || null,
      modifiedAt: existing.modifiedTime || null,
      sizeBytes,
    };

    await saveGoogleDriveConfig({
      lastBackupAt: existing.modifiedTime || null,
      lastBackupSize: sizeBytes,
      backupDetails: details,
    });

    return details;
  } catch {
    return null;
  }
}

// ─── Upload / Save to Google Drive ─────────────────────────────────────────

/**
 * Exports all system data (all SQLite tables, settings, stores) and uploads
 * directly to the user's personal Google Drive. Universal for Native & Desktop.
 */
export async function uploadBackupToGoogleDrive(): Promise<{
  success: boolean;
  timestamp: string;
  size: number;
  details: GoogleDriveBackupDetails;
}> {
  if (isBackupInProgress) {
    // Wait briefly for ongoing background auto-save to finish
    let waitCount = 0;
    while (isBackupInProgress && waitCount < 8) {
      await new Promise((r) => setTimeout(r, 400));
      waitCount++;
    }
    if (isBackupInProgress) {
      throw new Error('GDRIVE_BACKUP_IN_PROGRESS');
    }
  }

  isBackupInProgress = true;
  try {
    const accessToken = await getValidAccessToken();

    // 1. Generate full backup object (universal for SQLite / Web)
    const backupData = await generateBackupData();
    const backupJsonString = JSON.stringify(backupData, null, 2);
    const backupBytes =
      typeof Blob !== 'undefined'
        ? new Blob([backupJsonString]).size
        : backupJsonString.length;

    // 2. Compute exact item & record breakdown for chart & history
    const counts = {
      products: backupData.database.products?.length || 0,
      sales: backupData.database.sales?.length || 0,
      purchases: backupData.database.purchases?.length || 0,
      customers: backupData.database.customers?.length || 0,
      suppliers: backupData.database.suppliers?.length || 0,
      debts: (backupData.database.debts?.length || 0) + (backupData.database.purchase_debts?.length || 0),
      expenses: backupData.database.expenses?.length || 0,
      media: Object.keys((backupData as any).media || {}).length,
    };
    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

    // Determine earliest data timestamp
    let earliestDate: string | null = null;
    const saleDates = (backupData.database.sales || []).map((s: any) => s.created_at || s.date).filter(Boolean);
    const purchaseDates = (backupData.database.purchases || []).map((p: any) => p.date || p.created_at).filter(Boolean);
    const allDates = [...saleDates, ...purchaseDates].sort();
    if (allDates.length > 0 && allDates[0]) {
      earliestDate = String(allDates[0]).slice(0, 10);
    } else {
      earliestDate = backupData.meta.backupDate ? backupData.meta.backupDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
    }

    // 3. Search if file already exists in Drive
    const existingFile = await findBackupFileOnDrive(accessToken);

    const boundary = '-------FroshiarBoundary' + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: BACKUP_FILENAME,
      description: `Froshiar POS Complete Backup - ${totalRecords} records`,
      mimeType: 'application/json',
      properties: {
        totalRecords: String(totalRecords),
        productsCount: String(counts.products),
        salesCount: String(counts.sales),
        purchasesCount: String(counts.purchases),
        customersCount: String(counts.customers),
        suppliersCount: String(counts.suppliers),
        debtsCount: String(counts.debts),
        expensesCount: String(counts.expenses),
        mediaCount: String(counts.media),
        dataStartDate: String(earliestDate || ''),
        platform: String(Platform.OS),
        appVersion: String(backupData.meta.appVersion || '1.0.44'),
      },
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      backupJsonString +
      closeDelimiter;

    let uploadUrl: string;
    let method: 'POST' | 'PATCH';

    if (existingFile) {
      uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
      method = 'PATCH';
    } else {
      uploadUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
      method = 'POST';
    }

    let uploadRes = await fetch(uploadUrl, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    // If PATCH failed because file was deleted on Google Drive by user or moved (404), fallback to POST
    if (!uploadRes.ok && method === 'PATCH' && uploadRes.status === 404) {
      uploadUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
      method = 'POST';
      uploadRes = await fetch(uploadUrl, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });
    }

    if (!uploadRes.ok) {
      if (uploadRes.status === 401) throw new Error('GDRIVE_AUTH_REQUIRED');
      throw new Error(`GDRIVE_UPLOAD_FAILED_${uploadRes.status}`);
    }

    const timestamp = new Date().toISOString();
    const details: GoogleDriveBackupDetails = {
      totalRecords,
      productsCount: counts.products,
      salesCount: counts.sales,
      purchasesCount: counts.purchases,
      customersCount: counts.customers,
      suppliersCount: counts.suppliers,
      debtsCount: counts.debts,
      expensesCount: counts.expenses,
      mediaCount: counts.media,
      dataStartDate: earliestDate,
      platform: Platform.OS,
      appVersion: backupData.meta.appVersion || '1.0.44',
      createdAt: existingFile?.createdTime || timestamp,
      modifiedAt: timestamp,
      sizeBytes: backupBytes,
    };

    await saveGoogleDriveConfig({
      lastBackupAt: timestamp,
      lastBackupSize: backupBytes,
      backupDetails: details,
    });

    return {
      success: true,
      timestamp,
      size: backupBytes,
      details,
    };
  } finally {
    isBackupInProgress = false;
  }
}

// ─── Download & Restore from Google Drive ──────────────────────────────────

/**
 * Downloads the latest backup file from Google Drive, validates it,
 * checks licensing item limits, and performs a clean merge restore into SQLite.
 * Universal for Native & Desktop.
 */
export async function restoreBackupFromGoogleDrive(
  onProgress?: (step: { table: string; index: number; total: number }) => void
): Promise<RestoreSummary> {
  const accessToken = await getValidAccessToken();

  const driveFile = await findBackupFileOnDrive(accessToken);
  if (!driveFile) {
    throw new Error('NO_GDRIVE_BACKUP_FOUND');
  }

  // Download raw JSON
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${driveFile.id}?alt=media`;
  let res = await fetch(downloadUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status === 401) {
    // Retry once with refreshed token
    const freshToken = await getValidAccessToken();
    res = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${freshToken}`,
      },
    });
  }

  if (!res.ok) {
    if (res.status === 401) throw new Error('GDRIVE_AUTH_REQUIRED');
    throw new Error(`GDRIVE_DOWNLOAD_FAILED_${res.status}`);
  }

  const rawJson = await res.text();

  // Validate format and ensure it conforms to Froshiar schema
  const backup = validateAndParseBackupContent(rawJson);
  await assertBackupWithinItemLimit(backup);

  // Execute restore merge
  const summary = await performRestore(backup, (event) => {
    if (event.phase === 'table-start') {
      onProgress?.({
        table: event.table,
        index: event.tableIndex,
        total: event.totalTables,
      });
    }
  });

  // Rehydrate Zustand stores
  await Promise.all([
    useBusinessStore.persist.rehydrate(),
    useSettingsStore.persist.rehydrate(),
    useQuotationStore.persist.rehydrate(),
  ]);

  // Also reload active stores from newly populated SQLite
  try {
    const { useInventoryStore } = await import('@/store/inventoryStore');
    await useInventoryStore.getState().loadInventory();
  } catch {}
  try {
    const { useCustomerStore } = await import('@/store/customerStore');
    await useCustomerStore.getState().loadCustomers();
  } catch {}
  try {
    const { useSupplierStore } = await import('@/store/supplierStore');
    await useSupplierStore.getState().loadSuppliers();
  } catch {}
  try {
    const { useDebtStore } = await import('@/store/debtStore');
    await useDebtStore.getState().loadAll();
  } catch {}

  // Save latest backup details from Drive file
  const props = driveFile.properties || {};
  const sizeBytes = driveFile.size ? parseInt(driveFile.size, 10) : 0;
  await saveGoogleDriveConfig({
    lastBackupAt: driveFile.modifiedTime || new Date().toISOString(),
    lastBackupSize: sizeBytes,
    backupDetails: {
      totalRecords: parseInt(props.totalRecords || '0', 10) || summary.inserted + summary.updated,
      productsCount: parseInt(props.productsCount || '0', 10) || 0,
      salesCount: parseInt(props.salesCount || '0', 10) || 0,
      purchasesCount: parseInt(props.purchasesCount || '0', 10) || 0,
      customersCount: parseInt(props.customersCount || '0', 10) || 0,
      suppliersCount: parseInt(props.suppliersCount || '0', 10) || 0,
      debtsCount: parseInt(props.debtsCount || '0', 10) || 0,
      expensesCount: parseInt(props.expensesCount || '0', 10) || 0,
      mediaCount: parseInt(props.mediaCount || '0', 10) || 0,
      dataStartDate: props.dataStartDate || null,
      platform: props.platform || null,
      appVersion: props.appVersion || null,
      createdAt: driveFile.createdTime || null,
      modifiedAt: driveFile.modifiedTime || null,
      sizeBytes,
    },
  });

  return summary;
}

// ─── Auto-Backup Lifecycle Trigger ─────────────────────────────────────────

/**
 * Debounced auto-backup hook triggered whenever the app opens or closes.
 * Respects connection status and cooldown to prevent unnecessary network load.
 */
export async function triggerGoogleDriveAutoBackup(
  reason: 'app_open' | 'app_close'
): Promise<void> {
  const now = Date.now();
  if (now - lastAutoBackupAttempt < AUTO_BACKUP_COOLDOWN_MS) {
    return;
  }

  try {
    const config = await getGoogleDriveConfig();
    if (!config.isConnected || !config.autoBackupEnabled) {
      return;
    }

    lastAutoBackupAttempt = now;
    if (__DEV__) {
      console.log(`[GoogleDrive] Starting auto-backup (${reason})...`);
    }

    await uploadBackupToGoogleDrive();

    if (__DEV__) {
      console.log(`[GoogleDrive] Auto-backup completed (${reason}).`);
    }
  } catch (err) {
    // Silent fail in background so user experience is never blocked
    if (__DEV__) {
      console.log(`[GoogleDrive] Auto-backup skipped/failed (${reason}):`, err);
    }
  }
}
