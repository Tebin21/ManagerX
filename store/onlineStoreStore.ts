import { create } from 'zustand';
import { Linking } from 'react-native';
import { copyToClipboard } from '@/lib/clipboard';
import { getPendingSyncCount, bulkSetStoreVisibility } from '@/lib/sqlite';
import { OnlineStoreApiError, STORE_FRONTEND_BASE_URL, setStoreStatus, slugify } from '@/lib/onlineStore/api';
import { completeStoreRegistration, processQueue } from '@/lib/onlineStore/syncEngine';
import { hasActiveOnlineStoreSubscription } from '@/lib/onlineStoreSubscription/subscription';
import {
  getStoreEnabled,
  setStoreEnabled,
  getStoreSlug,
  setStoreSlug,
  getStoreApiKey,
  clearStoreApiKey,
  getLastSyncAt,
  getLastSyncError,
  getBulkPublishEnabled,
  setBulkPublishEnabled as persistBulkPublishEnabled,
} from '@/lib/onlineStore/storage';
import {
  loadStoreInfoFields,
  saveStoreInfoFields,
  type StoreInfoFields,
} from '@/lib/onlineStore/storeInfo';
import { useBusinessStore } from '@/store/businessStore';

function buildStoreUrl(slug: string | null): string | null {
  // The displayed/copied/opened URL is always the public storefront domain — never the
  // API domain (which the device only ever talks to via fetch(), never opens a browser to).
  return slug ? `${STORE_FRONTEND_BASE_URL}/${slug}` : null;
}

// businessStore is persisted (AsyncStorage) and rehydrates asynchronously. load() runs
// very early — straight from app/(app)/_layout.tsx's first effect — and can easily win
// the race against that rehydration, reading an empty `name` and never generating a
// slug at all. Wait for it explicitly instead of reading getState() blind.
function waitForBusinessHydration(): Promise<void> {
  if (useBusinessStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useBusinessStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

interface OnlineStoreState {
  enabled: boolean;
  slug: string | null;
  storeUrl: string | null;
  lastSyncAt: string | null;
  pendingCount: number;
  isRegistering: boolean;
  isLoading: boolean;
  isSyncingNow: boolean;
  storeInfoFields: StoreInfoFields;
  /** Set when the last sync attempt failed — e.g. "Store registration was lost on
   *  the server". Shown directly in the settings screen since there's no way to
   *  inspect a production device's console logs after the fact. Cleared on the
   *  next successful sync. */
  lastSyncError: string | null;
  /** "Enable Online Store For All Products" master toggle (Inventory header bulk-sync
   *  modal) — mirrors lib/onlineStore/storage.ts's persisted flag. When true, every
   *  existing + future product is auto-published (see bulkSetStoreVisibility() /
   *  insertProduct() in lib/sqlite.ts). */
  bulkPublishEnabled: boolean;
  isBulkPublishing: boolean;

  load: () => Promise<void>;
  /** Returns {status:'locked'} without making any local write or network call when
   *  there's no active Online Store Subscription — the caller (UI) shows a message
   *  instead of silently no-op'ing. */
  enable: () => Promise<{ status: 'ok' | 'locked' }>;
  /** Never gated — disabling must always succeed, even with an expired/missing
   *  subscription. The system auto-disabling on expiry is a different concern from
   *  blocking the user from disabling manually. */
  disable: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
  /** Saves the store-info fields (description/social links) locally and
   *  kicks off an immediate push attempt. There's no offline outbox for these
   *  fields — if the push fails now, syncEngine's existing triggers (debounce/
   *  periodic/manual) retry it opportunistically until it succeeds. Not gated here
   *  directly — processQueue() (which this calls) already gates itself. */
  saveStoreInfo: (fields: Partial<StoreInfoFields>) => Promise<void>;
  /** Manual "Sync Now" action. Returns {status:'locked'} immediately, with no
   *  network call, when there's no active Online Store Subscription. Safe to call
   *  even if a debounced/periodic sync is already in flight — processQueue() has its
   *  own re-entrancy guard, so this just becomes a no-op network-wise but still
   *  refreshes the displayed stats. */
  syncNow: () => Promise<{ status: 'ok' | 'locked' }>;
  /** Bulk-publishes/unpublishes ALL products in one action. Gated on subscription
   *  ONLY when turning ON (enabled===true) — mirrors enable()/disable()'s asymmetry:
   *  removing everything from the store must always succeed even with an
   *  expired/missing subscription. Bypasses the debounce (like syncNow()) and
   *  forwards onProgress through processQueue() so a caller (the Inventory bulk-sync
   *  modal) can render a determinate progress bar across 10,000+ products. */
  setBulkPublishEnabled: (
    enabled: boolean,
    onProgress?: (done: number, total: number) => void
  ) => Promise<{ status: 'ok' | 'locked' }>;
  /** Returns true if the link was actually copied — false if the clipboard is
   *  unavailable (e.g. native module not linked) or the copy itself failed, so the
   *  caller can fall back to showing the link instead of silently doing nothing. */
  copyLink: () => Promise<boolean>;
  openWebsite: () => void;
}

export const useOnlineStoreStore = create<OnlineStoreState>((set, get) => ({
  enabled: false,
  slug: null,
  storeUrl: null,
  lastSyncAt: null,
  pendingCount: 0,
  isRegistering: false,
  isLoading: false,
  isSyncingNow: false,
  storeInfoFields: { description: '', facebookUrl: '', instagramUrl: '' },
  lastSyncError: null,
  bulkPublishEnabled: false,
  isBulkPublishing: false,

  load: async () => {
    // The store's URL is shown immediately from the business name — entirely local, no
    // network/backend required (per spec: "Always show the generated store URL").
    // Committed in its own set() call, deliberately separate from the stats below: a
    // failure fetching last-sync/pending-count must never be able to suppress a
    // perfectly good, already-computed URL.
    let slug: string | null = null;
    try {
      slug = await getStoreSlug();
      if (!slug) {
        await waitForBusinessHydration();
        const businessName = useBusinessStore.getState().name?.trim();
        if (businessName) {
          slug = slugify(businessName);
          await setStoreSlug(slug);
        }
      }
    } catch (err) {
      if (__DEV__) console.warn('[onlineStore] slug resolution failed:', err);
    }
    set({ slug, storeUrl: buildStoreUrl(slug) });

    try {
      const [enabled, lastSyncAt, pendingCount, apiKey, storeInfoFields, lastSyncError, bulkPublishEnabled] = await Promise.all([
        getStoreEnabled(),
        getLastSyncAt(),
        getPendingSyncCount(),
        getStoreApiKey(),
        loadStoreInfoFields(),
        getLastSyncError(),
        getBulkPublishEnabled(),
      ]);
      set({
        enabled, lastSyncAt, pendingCount, isRegistering: enabled && !apiKey, storeInfoFields,
        lastSyncError: lastSyncError || null,
        bulkPublishEnabled,
      });
    } catch (err) {
      if (__DEV__) console.warn('[onlineStore] load (stats) failed:', err);
    }
  },

  enable: async () => {
    // Gate FIRST, before any local write — a locked user's `enabled` flag must never
    // flip to true, or the next background sync trigger (60s timer, app-foreground)
    // would try (and fail) against the backend anyway, leaving a confusing half-state.
    if (!(await hasActiveOnlineStoreSubscription())) return { status: 'locked' };

    set({ isLoading: true });
    try {
      await setStoreEnabled(true);
      await get().load(); // ensures a local slug exists even on the very first enable
      const { slug } = get();
      const apiKey = await getStoreApiKey();
      const businessName = useBusinessStore.getState().name || 'My Store';
      if (slug && !apiKey) {
        // Never successfully registered with the backend yet — try now.
        try {
          await completeStoreRegistration(businessName);
        } catch (err) {
          if (__DEV__) console.warn('[onlineStore] registration deferred (offline?):', err);
        }
      } else if (slug && apiKey) {
        try {
          await setStoreStatus(slug, apiKey, true);
        } catch (err) {
          // Same stale-registration case as syncEngine.ts: the backend no longer
          // has this store (e.g. lost after a restart without persistent storage).
          // Clear the dead key now so the processQueue() call below re-registers
          // immediately instead of the toggle just silently doing nothing.
          if (err instanceof OnlineStoreApiError && err.status === 404) await clearStoreApiKey();
        }
      }
      await get().load();
      processQueue();
      return { status: 'ok' };
    } finally {
      set({ isLoading: false });
    }
  },

  disable: async () => {
    set({ isLoading: true });
    try {
      await setStoreEnabled(false);
      const slug = await getStoreSlug();
      const apiKey = await getStoreApiKey();
      if (slug && apiKey) {
        try { await setStoreStatus(slug, apiKey, false); } catch { /* picked up next sync */ }
      }
      await get().load();
    } finally {
      set({ isLoading: false });
    }
  },

  refreshPendingCount: async () => {
    try {
      set({ pendingCount: await getPendingSyncCount() });
    } catch (err) {
      if (__DEV__) console.warn('[onlineStore] refreshPendingCount failed:', err);
    }
  },

  syncNow: async () => {
    // Manual user action deserves an immediate typed rejection, not a silent
    // background no-op — same gate processQueue() applies internally, checked here
    // too so the UI can show a message right away without a network round-trip.
    if (!(await hasActiveOnlineStoreSubscription())) return { status: 'locked' };

    set({ isSyncingNow: true });
    try {
      await processQueue();
      await get().load();
      return { status: 'ok' };
    } finally {
      set({ isSyncingNow: false });
    }
  },

  setBulkPublishEnabled: async (enabled, onProgress) => {
    // Same gating asymmetry as enable()/disable(): turning everything OFF must
    // always succeed, even with an expired/missing subscription.
    if (enabled && !(await hasActiveOnlineStoreSubscription())) return { status: 'locked' };

    set({ isBulkPublishing: true });
    try {
      await persistBulkPublishEnabled(enabled);
      await bulkSetStoreVisibility(enabled);
      await processQueue(onProgress); // bypasses the debounce, like syncNow()
      set({ bulkPublishEnabled: enabled });
      await get().refreshPendingCount();
      // processQueue() never throws (failures are written to storage instead) — read
      // it back so a failure during this bulk action is visible immediately in
      // whichever screen is mounted, instead of waiting for a fresh load() elsewhere.
      set({ lastSyncError: (await getLastSyncError()) || null });
      return { status: 'ok' };
    } finally {
      set({ isBulkPublishing: false });
    }
  },

  saveStoreInfo: async (fields) => {
    await saveStoreInfoFields(fields);
    set({ storeInfoFields: { ...get().storeInfoFields, ...fields } });
    processQueue(); // fire-and-forget — opportunistic push, retried automatically on failure
  },

  copyLink: async () => {
    const { storeUrl } = get();
    if (!storeUrl) return false;
    return copyToClipboard(storeUrl);
  },

  openWebsite: () => {
    const { storeUrl } = get();
    if (storeUrl) Linking.openURL(storeUrl);
  },
}));
