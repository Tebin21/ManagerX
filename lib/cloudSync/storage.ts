// Local, device/session-scoped cloud-sync status — mirrors the pattern in
// lib/onlineStore/storage.ts. Lives in the generic SQLite `settings` key-value
// table but is deliberately never added to lib/backup.ts's SETTINGS_ALLOWLIST:
// this is per-device sync bookkeeping, not portable business data.
import { saveSetting, loadSetting } from '@/lib/sqlite';

export async function getLastSyncedAt(): Promise<string | null> {
  return loadSetting('cloud_sync_last_synced_at');
}

export async function setLastSyncedAt(iso: string): Promise<void> {
  await saveSetting('cloud_sync_last_synced_at', iso);
}

export async function getLastSyncError(): Promise<string | null> {
  const value = await loadSetting('cloud_sync_last_error');
  return value || null;
}

export async function setLastSyncError(message: string): Promise<void> {
  await saveSetting('cloud_sync_last_error', message);
}

export async function clearLastSyncError(): Promise<void> {
  await saveSetting('cloud_sync_last_error', '');
}

// Set once the first-login decision tree (lib/cloudSync/restore.ts) has fully
// resolved for the currently-signed-in uid — pull listeners must not attach
// before this, or an incremental pull could race a bulk restore over the same
// rows. Keyed by uid so switching accounts on one device can't reuse a stale flag.
export async function getInitialSyncDoneFor(uid: string): Promise<boolean> {
  return (await loadSetting(`cloud_sync_initial_done_${uid}`)) === '1';
}

export async function setInitialSyncDoneFor(uid: string): Promise<void> {
  await saveSetting(`cloud_sync_initial_done_${uid}`, '1');
}
