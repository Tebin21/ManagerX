// Drains the offline-first sync_queue (lib/sqlite.ts) to the Online Store backend whenever
// connectivity returns or the app comes to the foreground — no manual "Refresh Website"
// button anywhere by design.
import { AppState, type AppStateStatus } from 'react-native';
import { addConnectivityListener } from '@/lib/netInfo';
import { getPendingSyncProducts, clearSyncQueue, type PendingSyncItem } from '@/lib/sqlite';
import { pushSync, registerStore, type SyncChange } from './api';
import {
  getStoreEnabled,
  getStoreSlug,
  getStoreApiKey,
  setStoreSlug,
  setStoreApiKey,
  setLastSyncAt,
} from './storage';

function toSyncChange(item: PendingSyncItem): SyncChange | null {
  if (item.operation === 'delete') {
    return { productId: item.productId, operation: 'delete' };
  }
  if (!item.product) return null; // re-deleted before we got a chance to sync the upsert
  const p = item.product;
  return {
    productId: item.productId,
    operation: 'upsert',
    name: p.name,
    price: p.sellingPrice,
    quantity: p.quantity,
    imageUrl: p.imageUri,
    isPublished: p.storeVisible,
    updatedAt: p.updatedAt,
  };
}

export async function completeStoreRegistration(businessName: string): Promise<{ slug: string }> {
  const { slug, apiKey } = await registerStore(businessName);
  await setStoreSlug(slug);
  await setStoreApiKey(apiKey);
  return { slug };
}

let isSyncing = false;

export async function processQueue(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const enabled = await getStoreEnabled();
    if (!enabled) return;

    let slug = await getStoreSlug();
    let apiKey = await getStoreApiKey();

    if (!slug || !apiKey) {
      // "Enable Store" was pressed while offline (or the first registration call never
      // reached the server) — retry registration now that we're being asked to sync.
      const { useBusinessStore } = await import('@/store/businessStore');
      const businessName = useBusinessStore.getState().name || 'My Store';
      try {
        const result = await completeStoreRegistration(businessName);
        slug = result.slug;
        apiKey = await getStoreApiKey();
      } catch {
        return; // still unreachable — next NetInfo/AppState trigger will retry
      }
    }
    if (!slug || !apiKey) return;

    const pending = await getPendingSyncProducts();
    if (pending.length === 0) return;

    const changes = pending.map(toSyncChange).filter((c): c is SyncChange => c !== null);
    if (changes.length > 0) {
      const result = await pushSync(slug, apiKey, changes);
      await setLastSyncAt(result.syncedAt);
    }
    await clearSyncQueue(pending.map((p) => p.queueId));
  } catch (err) {
    if (__DEV__) console.warn('[onlineStore] sync failed, will retry on next trigger:', err);
  } finally {
    isSyncing = false;
  }
}

let started = false;

export function startAutoSync(): void {
  if (started) return;
  started = true;

  addConnectivityListener((isConnected) => {
    if (isConnected) processQueue();
  });

  AppState.addEventListener('change', (status: AppStateStatus) => {
    if (status === 'active') processQueue();
  });
}
