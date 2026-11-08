// Drains the offline-first sync_queue (lib/sqlite.ts) to the Online Store backend whenever
// connectivity returns or the app comes to the foreground — no manual "Refresh Website"
// button anywhere by design.
import { AppState, type AppStateStatus } from 'react-native';
import { addConnectivityListener } from '@/lib/netInfo';
import {
  getPendingSyncProducts,
  clearSyncQueue,
  setProductImageRemoteUrl,
  enqueueProductsWithPendingImages,
  type PendingSyncItem,
} from '@/lib/sqlite';
import {
  OnlineStoreApiError,
  isOnlineStoreApiError,
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
import { hasActiveOnlineStoreSubscription } from '@/lib/onlineStoreSubscription/subscription';

const LOCAL_URI_PATTERN = /^(file|content):/;

// Uploads a pending item's local image (if any) before it's allowed to sync, so the
// backend/storefront never receives a device-local URI it could never load. Returns
// false if the item should be left in the queue for the next sync cycle (upload
// failed) — other items in the same batch still proceed.
async function ensureRemoteImage(item: PendingSyncItem, slug: string, apiKey: string): Promise<boolean> {
  if (item.operation !== 'upsert' || !item.product) return true;
  const p = item.product;
  const isLocalUri = !!p?.imageUri && LOCAL_URI_PATTERN.test(p.imageUri);
  if (!isLocalUri) return true;

  const { resolveImageUri } = await import('@/lib/imageStorage');
  const targetUri = resolveImageUri(p.imageUri) || p.imageUri!;

  // If already uploaded under the active slug, nothing to do
  const hasValidSlugUrl = !!p.imageRemoteUrl && p.imageRemoteUrl.includes(`/uploads/${slug}/`);
  if (hasValidSlugUrl) return true;

  try {
    const { url } = await uploadStoreImage(slug, apiKey, targetUri);
    await setProductImageRemoteUrl(item.productId, url);
    p.imageRemoteUrl = url; // mutate in place so this sync round already reflects it
    return true;
  } catch (err) {
    // If the local file is missing on device, skip trying to upload it without failing store credentials
    if (isOnlineStoreApiError(err) && err.message.includes('Image file not found')) {
      if (__DEV__) console.warn('[onlineStore] skipping missing local image for product:', item.productId);
      return true;
    }
    // A 404/401 means the store credential is gone or invalid — propagate so
    // processQueue()'s outer catch can clear the stale registration and re-register.
    if (isOnlineStoreApiError(err) && (err.status === 404 || err.status === 401)) throw err;
    if (__DEV__) console.warn('[onlineStore] image upload failed, leaving in queue to retry:', err);
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
  const isLocalUri = !!p?.imageUri && LOCAL_URI_PATTERN.test(p.imageUri);
  return {
    productId: item.productId,
    operation: 'upsert',
    name: p.name || 'Product',
    category: p.category || 'General',
    description: p.description ?? null,
    websiteDescription: p.websiteDescription ?? null,
    price: Number(p.sellingPrice) || 0,
    quantity: Math.max(0, Number(p.quantity) || 0),
    imageUrl: p.imageRemoteUrl ?? (isLocalUri ? null : p.imageUri),
    isPublished: p.storeVisible !== undefined ? Boolean(p.storeVisible) : true,
    updatedAt: p.updatedAt,
  };
}

// The business logo lives in store/businessStore.ts as a local file://-style URI.
// Uploads it once and remembers which local URI it came from, so a later logo
// change (a different local URI) is detected and re-uploaded automatically.
// Returns [url, changed] — `changed` is true when a fresh upload just happened,
// which counts as something new to push even if the dirty flag wasn't set.
async function ensureRemoteLogo(slug: string, apiKey: string): Promise<[string | null, boolean]> {
  const { loadStoreInfoFields } = await import('./storeInfo');
  const fields = await loadStoreInfoFields();
  const { useBusinessStore } = await import('@/store/businessStore');
  const { resolveImageUri } = await import('@/lib/imageStorage');

  // Prioritize dedicated online store logo; fall back to general business logo
  const rawLogoUri = fields.logoUri || useBusinessStore.getState().logoUri;
  if (!rawLogoUri) return [null, false];
  if (!LOCAL_URI_PATTERN.test(rawLogoUri)) return [rawLogoUri, false]; // already a remote URL

  const logoUri = resolveImageUri(rawLogoUri) || rawLogoUri;
  if (!fields.logoUri && logoUri !== rawLogoUri) {
    useBusinessStore.getState().updateLogo(logoUri);
  }

  const { remoteUrl, uploadedFromUri } = await getLogoUploadState();
  const hasValidSlugUrl = !!remoteUrl && remoteUrl.includes(`/uploads/${slug}/`);
  if (hasValidSlugUrl && (uploadedFromUri === logoUri || uploadedFromUri === rawLogoUri)) return [remoteUrl, false];

  try {
    const { url } = await uploadStoreImage(slug, apiKey, logoUri);
    await setLogoUploadState(url, logoUri);
    return [url, true];
  } catch (err) {
    if (__DEV__) console.warn('[onlineStore] logo upload failed, will retry next cycle:', err);
    // If the local file is missing on device, mark it so we don't repeat the missing upload every cycle
    if (isOnlineStoreApiError(err) && err.message.includes('Image file not found')) {
      await setLogoUploadState(remoteUrl || '', logoUri);
    }
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
    const { useSettingsStore } = await import('@/store/settingsStore');
    const business = useBusinessStore.getState();
    const settings = useSettingsStore.getState();
    const accentColor = settings.accentColor;
    const isDarkMode = settings.isDarkMode;
    const storeThemeMode = (fields.themeMode === 'light' || fields.themeMode === 'dark')
      ? fields.themeMode
      : (isDarkMode ? 'dark' : 'light');
    await pushStoreInfo(slug, apiKey, {
      description: fields.description || undefined,
      facebookUrl: fields.facebookUrl || undefined,
      instagramUrl: fields.instagramUrl || undefined,
      tiktokUrl: fields.tiktokUrl || undefined,
      whatsappNumber: fields.whatsappNumber || undefined,
      businessName: fields.businessName?.trim() || business.name || undefined,
      phone: fields.phone?.trim() || business.phone || undefined,
      phoneSecondary: fields.phoneSecondary?.trim() || undefined,
      address: fields.address?.trim() || business.address || undefined,
      logoUrl: logoUrl ?? undefined,
      themeColor: accentColor ?? undefined,
      themeMode: storeThemeMode,
      hideOutOfStock: fields.hideOutOfStock ?? false,
    });
    await clearStoreInfoDirty();
  } catch (err) {
    // A 404 here means the store is gone — let it propagate to processQueue()'s
    // outer catch so the stale API key gets cleared and the store re-registers.
    // Swallowing it here (as ordinary transient failures still are) would silently
    // mask the exact same bug for stores with no pending PRODUCT changes, since
    // `pending.length === 0` short-circuits processQueue() before ever reaching
    // pushSync(), which is otherwise what surfaces this for the product-sync path.
    if (isOnlineStoreApiError(err) && (err.status === 404 || err.status === 401)) throw err;
    if (__DEV__) console.warn('[onlineStore] info push failed, will retry next cycle:', err);
  }
}

export async function completeStoreRegistration(businessName: string, desiredSlug?: string): Promise<{ slug: string }> {
  if (!desiredSlug) {
    desiredSlug = (await getStoreSlug()) || undefined;
  }
  if (__DEV__) console.log('[onlineStore] registering store, businessName =', businessName, 'desiredSlug =', desiredSlug);
  const { slug, apiKey, recovered } = await registerStore(businessName, desiredSlug);
  if (__DEV__) console.log('[onlineStore] registration succeeded, slug =', slug, 'recovered =', !!recovered);
  await setStoreSlug(slug);
  await setStoreApiKey(apiKey);
  return { slug };
}

let isSyncing = false;

export async function processQueue(
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  if (isSyncing) {
    let waitCount = 0;
    while (isSyncing && waitCount < 30) {
      await new Promise((r) => setTimeout(r, 200));
      waitCount++;
    }
    if (isSyncing) return;
  }
  isSyncing = true;
  try {
    const enabled = await getStoreEnabled();
    if (!enabled) return;

    // Online Store Subscription gate — positioned here deliberately, before slug/
    // apiKey resolution, so it also covers the re-registration branch just below
    // (an unsubscribed-but-enabled store must never reach POST /api/stores either).
    if (!(await hasActiveOnlineStoreSubscription())) {
      await setLastSyncError(
        'Online Store subscription required or expired — activate or renew to resume syncing.'
      );
      return;
    }

    let slug = await getStoreSlug();
    let apiKey = await getStoreApiKey();

    if (!slug) {
      // If no slug is set, never auto-generate a random store name/subdomain
      if (__DEV__) console.log('[onlineStore] No subdomain assigned, skipping background registration');
      return;
    }

    if (!apiKey) {
      // Slug was configured (e.g. by admin or user), but API key needs registration/recovery
      const { useBusinessStore } = await import('@/store/businessStore');
      const businessName = useBusinessStore.getState().name || slug;
      try {
        const result = await completeStoreRegistration(businessName, slug);
        slug = result.slug;
        apiKey = await getStoreApiKey();
      } catch (err) {
        if (__DEV__) console.warn('[onlineStore] registration failed, will retry next trigger:', err);
        await setLastSyncError(
          `Registration failed: ${err instanceof Error ? err.message : String(err)}`
        );
        return;
      }
    }
    if (!slug || !apiKey) return;

    if (__DEV__) console.log(`[onlineStore] processQueue: slug=${slug}`);

    // Runs regardless of whether there are pending product changes — info edits
    // have no queue of their own, so this is their only retry path.
    await pushStoreInfoOpportunistically(slug, apiKey);

    // Pick up any active store products whose local image hasn't reached the server yet
    // or whose remote URL belongs to a previous slug
    await enqueueProductsWithPendingImages(slug);

    const pending = await getPendingSyncProducts();
    if (pending.length === 0) {
      await clearLastSyncError();
      onProgress?.(0, 0);
      return;
    }
    if (__DEV__) console.log(`[onlineStore] processQueue: ${pending.length} pending change(s)`);

    // Chunk the network push into moderate batches (BATCH_SIZE=100) for fast, smooth progress feedback
    const BATCH_SIZE = 100;
    const IMAGE_CONCURRENCY = 4;
    const total = pending.length;
    let done = 0;

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);

      // 1. Gather all items in this batch that have a local image waiting to be uploaded
      const itemsWithLocalImage = batch.filter(
        (item) =>
          item.operation === 'upsert' &&
          item.product &&
          !!item.product?.imageUri &&
          LOCAL_URI_PATTERN.test(item.product.imageUri) &&
          (!item.product.imageRemoteUrl || !item.product.imageRemoteUrl.includes(`/uploads/${slug}/`))
      );

      // 2. Upload images concurrently with bounded pool so it's super fast without overloading connection
      if (itemsWithLocalImage.length > 0) {
        const pool = new Set<Promise<void>>();
        for (const item of itemsWithLocalImage) {
          const task = (async () => {
            try {
              await ensureRemoteImage(item, slug, apiKey);
            } catch (err) {
              if (isOnlineStoreApiError(err) && (err.status === 404 || err.status === 401)) {
                throw err;
              }
              // Transient or rate error: keep going, product will still be pushed, image retries later
            }
          })();
          pool.add(task);
          task.finally(() => pool.delete(task));
          if (pool.size >= IMAGE_CONCURRENCY) {
            await Promise.race(pool);
          }
        }
        await Promise.all(pool);
      }

      // 3. Push all products in this batch to online store!
      // IMPORTANT: Products are NEVER dropped if an image failed — they still sync with full name,
      // price, category, stock, and descriptions!
      const changes = batch.map(toSyncChange).filter((c): c is SyncChange => c !== null);

      if (changes.length > 0) {
        if (__DEV__) console.log('[onlineStore] pushing sync batch:', changes.length);
        const result = await pushSync(slug, apiKey, changes);
        await setLastSyncAt(result.syncedAt);
      }

      // 4. Mark all items in this batch as processed from queue
      await clearSyncQueue(batch.map((p) => p.queueId));

      done += batch.length;
      onProgress?.(done, total);
    }

    await clearLastSyncError();
  } catch (err) {
    if (isOnlineStoreApiError(err) && err.status === 402) {
      // The backend independently rejected this request for lacking a valid Online
      // Store Subscription — most likely the local subscription cache was stale (it
      // looked valid when checked above, but expired/was revoked by the time this
      // request actually landed). Unlike 404, there's no auto-recovery action here
      // (no "re-register" equivalent) — the user must actually activate/renew.
      if (__DEV__) console.warn('[onlineStore] subscription required/expired (402):', err);
      await setLastSyncError(
        'Online Store subscription required or expired — activate or renew to resume syncing.'
      );
    } else if (isOnlineStoreApiError(err) && (err.status === 404 || err.status === 401)) {
      // The backend no longer recognizes this store or the credential is invalid —
      // clear the stale API key so the next processQueue() run sees `!apiKey` above
      // and re-registers automatically.
      if (__DEV__) console.warn('[onlineStore] store not found or credentials invalid (404/401) — clearing stale registration:', err);
      await clearStoreApiKey();
      await setLastSyncError(
        'Store credentials were invalid or lost on the server — re-registering automatically on next sync.'
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
