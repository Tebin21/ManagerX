/**
 * Google Drive Backup & Restore Module for Froshiar.
 *
 * Saves customer database and settings directly to their personal Google Drive.
 * Zero data is stored on external or developer servers.
 *
 * Scope: drive.file (safe, restricted scope strictly accessing files created by Froshiar).
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  exportBackup,
  validateAndParseBackup,
  assertBackupWithinItemLimit,
  performRestore,
  type FroshiarBackup,
  type RestoreSummary,
} from '@/lib/backup';
import { useBusinessStore } from '@/store/businessStore';
import { useSettingsStore } from '@/store/settingsStore';

const WEB_CLIENT_ID =
  '1097351210121-glmjp9ul4vfa45hhsvemnmmpajff8eh6.apps.googleusercontent.com';

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
];

const GDRIVE_CONFIG_KEY = '@froshiar_gdrive_config';
const BACKUP_FILENAME = 'froshiar_backup.json';
const AUTO_BACKUP_COOLDOWN_MS = 45 * 1000; // 45 seconds debounce between auto-saves

export interface GoogleDriveConfig {
  isConnected: boolean;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  lastBackupAt: string | null;
  lastBackupSize: number | null;
  autoBackupEnabled: boolean;
}

const DEFAULT_CONFIG: GoogleDriveConfig = {
  isConnected: false,
  email: null,
  displayName: null,
  photoUrl: null,
  lastBackupAt: null,
  lastBackupSize: null,
  autoBackupEnabled: true,
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
      scopes: DRIVE_SCOPES,
    });
    googleSigninConfigured = true;
  }
  return GoogleSignin;
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
  const GoogleSignin = await getGoogleSignin();

  try {
    const tokens = await GoogleSignin.getTokens();
    if (tokens?.accessToken) {
      return tokens.accessToken;
    }
  } catch {
    // Access token expired or missing — fall through to silent refresh
  }

  // Attempt silent refresh
  try {
    await GoogleSignin.signInSilently();
    const tokens = await GoogleSignin.getTokens();
    if (tokens?.accessToken) {
      return tokens.accessToken;
    }
  } catch (err) {
    throw new Error('GDRIVE_AUTH_REQUIRED');
  }

  throw new Error('GDRIVE_AUTH_REQUIRED');
}

/**
 * Connect user's Google Drive account.
 */
export async function connectGoogleDrive(): Promise<GoogleDriveConfig> {
  const GoogleSignin = await getGoogleSignin();

  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  // Force scope prompt if needed
  const signInResult = await GoogleSignin.signIn();
  const tokens = await GoogleSignin.getTokens();

  if (!tokens?.accessToken) {
    throw new Error('GDRIVE_TOKEN_ERROR');
  }

  const user = signInResult.data?.user;
  const config = await saveGoogleDriveConfig({
    isConnected: true,
    email: user?.email ?? null,
    displayName: user?.name ?? null,
    photoUrl: user?.photo ?? null,
    autoBackupEnabled: true,
  });

  // Query if an existing backup already exists on Drive
  try {
    const existing = await findBackupFileOnDrive(tokens.accessToken);
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
  try {
    const GoogleSignin = await getGoogleSignin();
    await GoogleSignin.signOut().catch(() => {});
  } catch {
    // Native module might be unbundled
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

interface DriveFileRecord {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
}

async function findBackupFileOnDrive(
  accessToken: string
): Promise<DriveFileRecord | null> {
  const query = encodeURIComponent(
    `name = '${BACKUP_FILENAME}' and trashed = false`
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name,modifiedTime,size)`;

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

// ─── Upload / Save to Google Drive ─────────────────────────────────────────

/**
 * Exports all system data (all SQLite tables, settings, stores) and uploads
 * directly to the user's personal Google Drive.
 */
export async function uploadBackupToGoogleDrive(): Promise<{
  success: boolean;
  timestamp: string;
  size: number;
}> {
  if (isBackupInProgress) {
    throw new Error('GDRIVE_BACKUP_IN_PROGRESS');
  }

  isBackupInProgress = true;
  try {
    const accessToken = await getValidAccessToken();

    // 1. Export complete SQLite & Zustand system dump
    const fileUri = await exportBackup();

    const { File } = await import('expo-file-system');
    const backupFile = new File(fileUri);
    const backupJsonString = await backupFile.text();
    const backupBytes = new Blob([backupJsonString]).size || backupJsonString.length;

    // 2. Search if file already exists in Drive
    const existingFile = await findBackupFileOnDrive(accessToken);

    const boundary = '-------FroshiarBoundary' + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: BACKUP_FILENAME,
      description: 'Froshiar POS Complete System Backup (SQLite + Settings)',
      mimeType: 'application/json',
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
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

    const uploadRes = await fetch(uploadUrl, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!uploadRes.ok) {
      if (uploadRes.status === 401) throw new Error('GDRIVE_AUTH_REQUIRED');
      throw new Error(`GDRIVE_UPLOAD_FAILED_${uploadRes.status}`);
    }

    const timestamp = new Date().toISOString();
    await saveGoogleDriveConfig({
      lastBackupAt: timestamp,
      lastBackupSize: backupBytes,
    });

    return {
      success: true,
      timestamp,
      size: backupBytes,
    };
  } finally {
    isBackupInProgress = false;
  }
}

// ─── Download & Restore from Google Drive ──────────────────────────────────

/**
 * Downloads the latest backup file from Google Drive, validates it,
 * checks licensing item limits, and performs a clean merge restore into SQLite.
 */
export async function restoreBackupFromGoogleDrive(
  onProgress?: (step: { table: string; index: number; total: number }) => void
): Promise<RestoreSummary> {
  const accessToken = await getValidAccessToken();

  const driveFile = await findBackupFileOnDrive(accessToken);
  if (!driveFile) {
    throw new Error('NO_GDRIVE_BACKUP_FOUND');
  }

  // Download media
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${driveFile.id}?alt=media`;
  const res = await fetch(downloadUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('GDRIVE_AUTH_REQUIRED');
    throw new Error(`GDRIVE_DOWNLOAD_FAILED_${res.status}`);
  }

  const rawJson = await res.text();

  // Save to temporary cache file to validate and parse
  const { File, Paths } = await import('expo-file-system');
  const tempFile = new File(Paths.cache, `gdrive_restore_${Date.now()}.json`);
  if (tempFile.exists) tempFile.delete();
  await tempFile.write(rawJson);

  // Validate format and ensure it conforms to Froshiar schema
  const backup = await validateAndParseBackup(tempFile.uri);
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
  ]);

  // Clean up cache file
  try {
    if (tempFile.exists) tempFile.delete();
  } catch {
    // Non-fatal
  }

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
