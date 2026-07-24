// Local persistence for Online Store settings. Non-secret display fields (enabled, slug,
// last sync time) live in the generic SQLite settings table (see lib/sqlite.ts). The API
// key is a credential, so it goes in expo-secure-store instead — same pattern lib/supabase.ts
// already uses for auth secrets.
//
// expo-secure-store is imported lazily (inside each function below) rather than as a
// static top-level import: its entry point calls requireNativeModule() — a *throwing*
// native-module lookup — at module-evaluation time. This file is reached from
// app/(app)/_layout.tsx on essentially every authenticated session, so a static import
// would crash the whole app shell on any build where the native module isn't linked,
// instead of confining the failure to the one Online Store action that needs it.
import { saveSetting, loadSetting } from '@/lib/sqlite';

const API_KEY_STORE_KEY = 'online_store_api_key';

export async function getStoreEnabled(): Promise<boolean> {
  return (await loadSetting('online_store_enabled')) === '1';
}

export async function setStoreEnabled(enabled: boolean): Promise<void> {
  await saveSetting('online_store_enabled', enabled ? '1' : '0');
}

// "Enable Online Store For All Products" master toggle (Inventory header bulk-sync
// modal) — when on, every product (existing + newly created) is auto-published; see
// bulkSetStoreVisibility() and insertProduct() in lib/sqlite.ts.
export async function getBulkPublishEnabled(): Promise<boolean> {
  return (await loadSetting('online_store_bulk_publish_enabled')) === '1';
}

export async function setBulkPublishEnabled(enabled: boolean): Promise<void> {
  await saveSetting('online_store_bulk_publish_enabled', enabled ? '1' : '0');
}

export async function getStoreSlug(): Promise<string | null> {
  return loadSetting('online_store_slug');
}

export async function setStoreSlug(slug: string): Promise<void> {
  await saveSetting('online_store_slug', slug);
}

export async function getLastSyncAt(): Promise<string | null> {
  return loadSetting('online_store_last_sync_at');
}

export async function setLastSyncAt(iso: string): Promise<void> {
  await saveSetting('online_store_last_sync_at', iso);
}

export async function getStoreApiKey(): Promise<string | null> {
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(API_KEY_STORE_KEY);
}

export async function setStoreApiKey(key: string): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(API_KEY_STORE_KEY, key);
}

// Cleared when the backend reports the store no longer exists (404 — e.g. lost after
// a backend restart without persistent storage), so the next sync cycle's
// `if (!slug || !apiKey)` check in syncEngine.ts re-registers automatically instead
// of retrying the same doomed request against a dead registration forever.
export async function clearStoreApiKey(): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(API_KEY_STORE_KEY);
}

// User-visible diagnostic for the settings screen — answers "is sync actually
// failing, and why" directly in the app, since there's no way to see a production
// device's console logs after the fact.
export async function getLastSyncError(): Promise<string | null> {
  return loadSetting('online_store_last_sync_error');
}

export async function setLastSyncError(message: string): Promise<void> {
  await saveSetting('online_store_last_sync_error', message);
}

export async function clearLastSyncError(): Promise<void> {
  await saveSetting('online_store_last_sync_error', '');
}
