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
import {
  OnlineStoreApiError,
  pushSync,
  pushStoreInfo,
  registerStore,
  uploadStoreImage,
  type SyncChange,
} from './api';
import {
  getStoreEnabled,
  getStoreSlug,
  getStoreApiKey,
  setStoreSlug,
  setStoreApiKey,
  clearStoreApiKey,
  setLastSyncAt,
  setLastSyncError,
  clearLastSyncError,
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
    // A 404 means the store is gone — propagate so processQueue()'s outer catch can
    // clear the stale registration and re-register, instead of every pending item
    // with a local image retrying this exact doomed upload forever.
    if (err instanceof OnlineStoreApiError && err.status === 404) throw err;
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
    category: p.category,
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

// Store-info fields (description/social links + logo) have no offline
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
    // A 404 here means the store is gone — let it propagate to processQueue()'s
    // outer catch so the stale API key gets cleared and the store re-registers.
    // Swallowing it here (as ordinary transient failures still are) would silently
    // mask the exact same bug for stores with no pending PRODUCT changes, since
    // `pending.length === 0` short-circuits processQueue() before ever reaching
    // pushSync(), which is otherwise what surfaces this for the product-sync path.
    if (err instanceof OnlineStoreApiError && err.status === 404) throw err;
    if (__DEV__) console.warn('[onlineStore] info push failed, will retry next cycle:', err);
  }
}

export async function completeStoreRegistration(businessName: string): Promise<{ slug: string }> {
  if (__DEV__) console.log('[onlineStore] registering store, businessName =', businessName);
  const { slug, apiKey } = await registerStore(businessName);
  if (__DEV__) console.log('[onlineStore] registration succeeded, slug =', slug);
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
      } catch (err) {
        if (__DEV__) console.warn('[onlineStore] registration failed, will retry next trigger:', err);
        await setLastSyncError(
          `Registration failed: ${err instanceof Error ? err.message : String(err)}`
        );
        return; // still unreachable — next NetInfo/AppState trigger will retry
      }
    }
    if (!slug || !apiKey) return;

    if (__DEV__) console.log(`[onlineStore] processQueue: slug=${slug}`);

    // Runs regardless of whether there are pending product changes — info edits
    // have no queue of their own, so this is their only retry path.
    await pushStoreInfoOpportunistically(slug, apiKey);

    const pending = await getPendingSyncProducts();
    if (pending.length === 0) {
      await clearLastSyncError();
      return;
    }
    if (__DEV__) console.log(`[onlineStore] processQueue: ${pending.length} pending change(s)`);

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
      if (__DEV__) console.log('[onlineStore] pushing sync changes:', changes);
      const result = await pushSync(slug, apiKey, changes);
      if (__DEV__) console.log('[onlineStore] sync succeeded:', result);
      await setLastSyncAt(result.syncedAt);
    }
    await clearSyncQueue(ready.map((p) => p.queueId));
    await clearLastSyncError();
  } catch (err) {
    if (err instanceof OnlineStoreApiError && err.status === 404) {
      // The backend no longer recognizes this store — most commonly because its
      // ledger was lost (e.g. a host restart without persistent storage actually
      // attached) after this device had already registered successfully. Retrying
      // the exact same request would fail identically forever, so clear the stale
      // API key now: the next processQueue() run sees `!apiKey` above and
      // re-registers automatically (the dashboard "Enable Store" flow is also
      // available to the user, but this makes it self-heal without that).
      if (__DEV__) console.warn('[onlineStore] store not found on backend (404) — clearing stale registration:', err);
      await clearStoreApiKey();
      await setLastSyncError(
        'Store registration was lost on the server — re-registering automatically on next sync.'
      );
    } else {
      if (__DEV__) console.warn('[onlineStore] sync failed, will retry on next trigger:', err);
      await setLastSyncError(err instanceof Error ? err.message : String(err));
    }
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
