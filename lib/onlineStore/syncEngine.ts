// Drains the offline-first sync_queue (lib/sqlite.ts) to the Online Store backend whenever
// connectivity returns or the app comes to the foreground — no manual "Refresh Website"
// button anywhere by design.
import { AppState, type AppStateStatus } from 'react-native';
import { addConnectivityListener } from '@/lib/netInfo';
import {
  getPendingSyncProducts,
  clearSyncQueue,
  setProductImageRemoteUrl,
  type PendingSyncItem,
} from '@/lib/sqlite';
import { pushSync, pushStoreInfo, registerStore, uploadStoreImage, type SyncChange } from './api';
import {
  getStoreEnabled,
  getStoreSlug,
  getStoreApiKey,
  setStoreSlug,
  setStoreApiKey,
  setLastSyncAt,
} from './storage';
import {
  loadStoreInfoFields,
  getLogoUploadState,
  setLogoUploadState,
  isStoreInfoDirty,
  clearStoreInfoDirty,
} from './storeInfo';

const LOCAL_URI_PATTERN = /^(file|content):/;

// Uploads a pending item's local image (if any) before it's allowed to sync, so the
// backend/storefront never receives a device-local URI it could never load. Returns
// false if the item should be left in the queue for the next sync cycle (upload
// failed) — other items in the same batch still proceed.
async function ensureRemoteImage(item: PendingSyncItem, slug: string, apiKey: string): Promise<boolean> {
  if (item.operation !== 'upsert' || !item.product) return true;
  const p = item.product;
  const isLocalUri = !!p.imageUri && LOCAL_URI_PATTERN.test(p.imageUri);
  if (!isLocalUri || p.imageRemoteUrl) return true; // nothing local pending, or already uploaded

  try {
    const { url } = await uploadStoreImage(slug, apiKey, p.imageUri!);
    await setProductImageRemoteUrl(item.productId, url);
    p.imageRemoteUrl = url; // mutate in place so this sync round already reflects it
    return true;
  } catch (err) {
    if (__DEV__) console.warn('[onlineStore] image upload failed, will retry next cycle:', err);
    return false;
  }
}

function toSyncChange(item: PendingSyncItem): SyncChange | null {
  if (item.operation === 'delete') {
    return { productId: item.productId, operation: 'delete' };
  }
  if (!item.product) return null; // re-deleted before we got a chance to sync the upsert
  const p = item.product;
  // Never pass a local file://-style URI through to the backend — only a URL
  // we've already uploaded (or one that was already remote, e.g. http/https).
  const isLocalUri = !!p.imageUri && LOCAL_URI_PATTERN.test(p.imageUri);
  return {
    productId: item.productId,
    operation: 'upsert',
    name: p.name,
    price: p.sellingPrice,
    quantity: p.quantity,
    imageUrl: p.imageRemoteUrl ?? (isLocalUri ? null : p.imageUri),
    isPublished: p.storeVisible,
    updatedAt: p.updatedAt,
  };
}

// The business logo lives in store/businessStore.ts as a local file://-style URI.
// Uploads it once and remembers which local URI it came from, so a later logo
// change (a different local URI) is detected and re-uploaded automatically.
// Returns [url, changed] — `changed` is true when a fresh upload just happened,
// which counts as something new to push even if the dirty flag wasn't set.
async function ensureRemoteLogo(slug: string, apiKey: string): Promise<[string | null, boolean]> {
  const { useBusinessStore } = await import('@/store/businessStore');
  const logoUri = useBusinessStore.getState().logoUri;
  if (!logoUri) return [null, false];
  if (!LOCAL_URI_PATTERN.test(logoUri)) return [logoUri, false]; // already a remote URL

  const { remoteUrl, uploadedFromUri } = await getLogoUploadState();
  if (remoteUrl && uploadedFromUri === logoUri) return [remoteUrl, false];

  try {
    const { url } = await uploadStoreImage(slug, apiKey, logoUri);
    await setLogoUploadState(url, logoUri);
    return [url, true];
  } catch (err) {
    if (__DEV__) console.warn('[onlineStore] logo upload failed, will retry next cycle:', err);
    return [remoteUrl, false]; // keep showing whatever was last uploaded, if anything
  }
}

// Store-info fields (description/WhatsApp/hours/social + logo) have no offline
// outbox of their own, unlike products' sync_queue — instead a saved-but-unsynced
// edit is marked "dirty" (lib/onlineStore/storeInfo.ts) and retried here on the
// same triggers that already drive product sync, until it succeeds.
async function pushStoreInfoOpportunistically(slug: string, apiKey: string): Promise<void> {
  const [logoUrl, logoChanged] = await ensureRemoteLogo(slug, apiKey);
  const dirty = await isStoreInfoDirty();
  if (!dirty && !logoChanged) return;

  try {
    const fields = await loadStoreInfoFields();
    const { useBusinessStore } = await import('@/store/businessStore');
    const business = useBusinessStore.getState();
    await pushStoreInfo(slug, apiKey, {
      ...fields,
      phone: business.phone || undefined,
      address: business.address || undefined,
      logoUrl: logoUrl ?? undefined,
    });
    await clearStoreInfoDirty();
  } catch (err) {
    if (__DEV__) console.warn('[onlineStore] info push failed, will retry next cycle:', err);
  }
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

    // Runs regardless of whether there are pending product changes — info edits
    // have no queue of their own, so this is their only retry path.
    await pushStoreInfoOpportunistically(slug, apiKey);

    const pending = await getPendingSyncProducts();
    if (pending.length === 0) return;

    // Upload any local images first (sequentially — avoid bursting concurrent
    // multipart uploads at a single-core backend instance). An item whose upload
    // fails is left out of this round entirely; its queue row stays put and it's
    // retried on the next sync cycle without blocking everything else.
    const ready: PendingSyncItem[] = [];
    for (const item of pending) {
      if (await ensureRemoteImage(item, slug, apiKey)) ready.push(item);
    }
    if (ready.length === 0) return;

    const changes = ready.map(toSyncChange).filter((c): c is SyncChange => c !== null);
    if (changes.length > 0) {
      const result = await pushSync(slug, apiKey, changes);
      await setLastSyncAt(result.syncedAt);
    }
    await clearSyncQueue(ready.map((p) => p.queueId));
  } catch (err) {
    if (__DEV__) console.warn('[onlineStore] sync failed, will retry on next trigger:', err);
  } finally {
    isSyncing = false;
  }
}

// Fires processQueue() ~1.5s after the last call, so a burst of edits (or a bulk
// operation that enqueues many rows in a loop) still triggers exactly one network
// round-trip instead of one per change. This is the primary trigger now — the
// connectivity/foreground listeners below remain as a fallback, not the only path.
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 1500;

export function scheduleSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    processQueue();
  }, DEBOUNCE_MS);
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

  // Safety net for the (rare) case the debounced trigger above never fires —
  // e.g. the app was already foregrounded with connectivity the whole time and
  // some edge case skipped scheduleSync(). processQueue() itself is cheap to
  // call when there's nothing pending (single COUNT query, then an early return).
  setInterval(processQueue, 60_000);
}
