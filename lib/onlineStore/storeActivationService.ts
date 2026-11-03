import { getFirebaseFirestore, doc, getDoc, getDocs, collection, query, where, onSnapshot } from '@/lib/firebase';
import { useManagementStore } from '@/store/managementStore';
import { useAuthStore } from '@/store/authStore';

let isStoreActiveCache: boolean | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 15_000;

export function invalidateStoreActivationCache(): void {
  isStoreActiveCache = null;
  lastCheckTime = 0;
}

export function parseStoreActiveFromData(data: any): boolean {
  if (!data) return false;
  // If explicitly suspended or disabled
  if (data?.onlineStore?.status === 'suspended' || data?.onlineStore?.enabled === false) {
    return false;
  }
  if (data?.enabled === false || data?.status === 'suspended') {
    return false;
  }

  // Check expiration if specified
  const exp = data?.expiresAt || data?.onlineStore?.expiresAt;
  if (exp) {
    const expTime = new Date(exp).getTime();
    if (!isNaN(expTime) && expTime < Date.now()) {
      return false;
    }
  }

  // 1. Check nested onlineStore object (used in employee_accounts & user_subscriptions when admin activates)
  if (
    data?.onlineStore?.enabled === true ||
    data?.onlineStore?.status === 'active' ||
    Boolean(data?.onlineStore?.subdomain || data?.onlineStore?.slug)
  ) {
    return true;
  }

  // 2. Check store_activations collection doc
  if (
    data?.enabled === true ||
    data?.status === 'active' ||
    Boolean(data?.subdomain || data?.slug)
  ) {
    return true;
  }

  // 3. Fallback: storefront_enabled or onlineStoreActive
  if (data?.storefront_enabled === true || data?.onlineStoreActive === true) {
    return true;
  }

  return false;
}

export async function isOnlineStoreActivatedByAdmin(forceRefresh = false): Promise<boolean> {
  const now = Date.now();
  if (!forceRefresh && isStoreActiveCache !== null && now - lastCheckTime < CACHE_TTL_MS) {
    return isStoreActiveCache;
  }

  // 1. Employee Account Fast Check (in-memory)
  const { isEmployee, currentEmployeeAccount } = useManagementStore.getState();
  if (isEmployee && currentEmployeeAccount?.onlineStore) {
    const store = currentEmployeeAccount.onlineStore;
    const active = !!(store?.enabled && store?.status === 'active');
    if (active) {
      isStoreActiveCache = true;
      lastCheckTime = now;
      return true;
    }
  }

  // 2. Manager / Owner / User Check via Auth or Employee email
  const user = useAuthStore.getState().user;
  const email = (user?.email || currentEmployeeAccount?.email)?.trim().toLowerCase();
  if (!email) {
    return isStoreActiveCache ?? false;
  }

  try {
    const db = getFirebaseFirestore();
    const docId = email.replace(/[^a-z0-9_]/gi, '_');

    // Check store_activations, employee_accounts, and user_subscriptions in parallel for maximum speed
    const [storeSnap, empSnap, subSnap] = await Promise.all([
      getDoc(doc(db, 'store_activations', docId)).catch(() => null),
      getDoc(doc(db, 'employee_accounts', docId)).catch(() => null),
      getDoc(doc(db, 'user_subscriptions', docId)).catch(() => null),
    ]);

    // 1. Check store_activations (Primary online store activation record)
    if (storeSnap && (typeof storeSnap.exists === 'function' ? storeSnap.exists() : (storeSnap as any).exists)) {
      const data = storeSnap.data();
      if (parseStoreActiveFromData(data)) {
        isStoreActiveCache = true;
        lastCheckTime = now;
        return true;
      }
    }

    // 2. Check employee_accounts
    if (empSnap && (typeof empSnap.exists === 'function' ? empSnap.exists() : (empSnap as any).exists)) {
      const data = empSnap.data();
      if (parseStoreActiveFromData(data)) {
        isStoreActiveCache = true;
        lastCheckTime = now;
        return true;
      }
    }

    // 3. Check user_subscriptions
    if (subSnap && (typeof subSnap.exists === 'function' ? subSnap.exists() : (subSnap as any).exists)) {
      const data = subSnap.data();
      if (parseStoreActiveFromData(data)) {
        isStoreActiveCache = true;
        lastCheckTime = now;
        return true;
      }
    }

    // 4. Query fallback for store_activations by email field
    try {
      const q = query(collection(db, 'store_activations'), where('email', '==', email));
      const querySnap = await getDocs(q);
      for (const d of querySnap.docs) {
        if (parseStoreActiveFromData(d.data())) {
          isStoreActiveCache = true;
          lastCheckTime = now;
          return true;
        }
      }
    } catch {}
  } catch (err) {
    console.warn('[storeActivationService] Server check failed:', err);
  }

  isStoreActiveCache = false;
  lastCheckTime = now;
  return false;
}

export interface AdminOnlineStoreConfig {
  isActive: boolean;
  subdomain?: string;
  storeName?: string;
  status?: string;
}

export async function getOnlineStoreConfigFromAdmin(): Promise<AdminOnlineStoreConfig | null> {
  const { isEmployee, currentEmployeeAccount } = useManagementStore.getState();
  if (isEmployee && currentEmployeeAccount?.onlineStore?.subdomain) {
    const store = currentEmployeeAccount.onlineStore;
    const active = !!(store?.enabled && store?.status === 'active');
    return {
      isActive: active,
      subdomain: store.subdomain,
      storeName: store.storeName,
      status: store.status,
    };
  }

  const user = useAuthStore.getState().user;
  const email = (user?.email || currentEmployeeAccount?.email)?.trim().toLowerCase();
  if (!email) return null;

  try {
    const db = getFirebaseFirestore();
    const docId = email.replace(/[^a-z0-9_]/gi, '_');

    // Run parallel lookup across collections for instant config retrieval
    const [storeSnap, empSnap, subSnap] = await Promise.all([
      getDoc(doc(db, 'store_activations', docId)).catch(() => null),
      getDoc(doc(db, 'employee_accounts', docId)).catch(() => null),
      getDoc(doc(db, 'user_subscriptions', docId)).catch(() => null),
    ]);

    // 1. Check store_activations (Primary online store activation record)
    if (storeSnap && (typeof storeSnap.exists === 'function' ? storeSnap.exists() : (storeSnap as any).exists)) {
      const data = storeSnap.data();
      if (parseStoreActiveFromData(data) && data?.subdomain) {
        return {
          isActive: true,
          subdomain: data.subdomain,
          storeName: data.storeName,
          status: data.status,
        };
      }
    }

    // 2. Check employee_accounts
    if (empSnap && (typeof empSnap.exists === 'function' ? empSnap.exists() : (empSnap as any).exists)) {
      const data = empSnap.data();
      if (parseStoreActiveFromData(data) && data?.onlineStore?.subdomain) {
        return {
          isActive: true,
          subdomain: data.onlineStore.subdomain,
          storeName: data.onlineStore.storeName,
          status: data.onlineStore.status,
        };
      }
    }

    // 3. Check user_subscriptions
    if (subSnap && (typeof subSnap.exists === 'function' ? subSnap.exists() : (subSnap as any).exists)) {
      const data = subSnap.data();
      if (parseStoreActiveFromData(data) && data?.onlineStore?.subdomain) {
        return {
          isActive: true,
          subdomain: data.onlineStore.subdomain,
          storeName: data.onlineStore.storeName,
          status: data.onlineStore.status,
        };
      }
    }

    // 4. Query fallback for store_activations by email field
    try {
      const q = query(collection(db, 'store_activations'), where('email', '==', email));
      const querySnap = await getDocs(q);
      for (const d of querySnap.docs) {
        const data = d.data();
        if (parseStoreActiveFromData(data) && data?.subdomain) {
          return {
            isActive: true,
            subdomain: data.subdomain,
            storeName: data.storeName,
            status: data.status,
          };
        }
      }
    } catch {}
  } catch (err) {
    console.warn('[storeActivationService] Failed to load config:', err);
  }

  return null;
}

let unsubEmployee: (() => void) | null = null;
let unsubSubscription: (() => void) | null = null;
let unsubStoreActivation: (() => void) | null = null;
let currentListeningDocId: string | null = null;

export function startStoreActivationRealtimeListener(): () => void {
  function setupListenerForEmail(email?: string | null) {
    const cleanEmail = email?.trim().toLowerCase();
    const docId = cleanEmail ? cleanEmail.replace(/[^a-z0-9_]/gi, '_') : null;

    if (!docId || docId === currentListeningDocId) {
      return;
    }

    // Cleanup previous subscriptions
    unsubEmployee?.();
    unsubSubscription?.();
    unsubStoreActivation?.();
    currentListeningDocId = docId;

    try {
      const db = getFirebaseFirestore();

      const handleSnapshotChange = async () => {
        invalidateStoreActivationCache();
        try {
          const { invalidateSubscriptionCache } = await import('@/lib/onlineStoreSubscription/subscription');
          invalidateSubscriptionCache();
        } catch {}

        const active = await isOnlineStoreActivatedByAdmin(true);

        try {
          const { useOnlineStoreSubscriptionStore } = await import('@/store/onlineStoreSubscriptionStore');
          await useOnlineStoreSubscriptionStore.getState().loadSubscription();
        } catch {}

        try {
          const { useOnlineStoreStore } = await import('@/store/onlineStoreStore');
          if (active) {
            await useOnlineStoreStore.getState().syncWithSubscription(true);
          }
          await useOnlineStoreStore.getState().load();
        } catch {}
      };

      unsubEmployee = onSnapshot(doc(db, 'employee_accounts', docId), () => {
        handleSnapshotChange().catch(() => {});
      }, () => {});

      unsubSubscription = onSnapshot(doc(db, 'user_subscriptions', docId), () => {
        handleSnapshotChange().catch(() => {});
      }, () => {});

      unsubStoreActivation = onSnapshot(doc(db, 'store_activations', docId), () => {
        handleSnapshotChange().catch(() => {});
      }, () => {});

      // Immediate initial reconciliation on setup
      handleSnapshotChange().catch(() => {});
    } catch (err) {
      console.warn('[storeActivationService] Realtime listener setup error:', err);
    }
  }

  // Initial setup with current auth state
  setupListenerForEmail(useAuthStore.getState().user?.email);

  // Re-bind when user logs in or switches account
  const unsubAuth = useAuthStore.subscribe((state) => {
    setupListenerForEmail(state.user?.email);
  });

  return () => {
    unsubAuth();
    unsubEmployee?.();
    unsubSubscription?.();
    unsubStoreActivation?.();
    currentListeningDocId = null;
  };
}
