import { create } from 'zustand';
import { Linking } from 'react-native';
import { copyToClipboard } from '@/lib/clipboard';
import { getPendingSyncCount } from '@/lib/sqlite';
import { STORE_FRONTEND_BASE_URL, setStoreStatus, slugify } from '@/lib/onlineStore/api';
import { completeStoreRegistration, processQueue } from '@/lib/onlineStore/syncEngine';
import {
  getStoreEnabled,
  setStoreEnabled,
  getStoreSlug,
  setStoreSlug,
  getStoreApiKey,
  getLastSyncAt,
} from '@/lib/onlineStore/storage';
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

  load: () => Promise<void>;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
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
      const [enabled, lastSyncAt, pendingCount, apiKey] = await Promise.all([
        getStoreEnabled(),
        getLastSyncAt(),
        getPendingSyncCount(),
        getStoreApiKey(),
      ]);
      set({ enabled, lastSyncAt, pendingCount, isRegistering: enabled && !apiKey });
    } catch (err) {
      if (__DEV__) console.warn('[onlineStore] load (stats) failed:', err);
    }
  },

  enable: async () => {
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
        try { await setStoreStatus(slug, apiKey, true); } catch { /* retried by processQueue */ }
      }
      await get().load();
      processQueue();
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
