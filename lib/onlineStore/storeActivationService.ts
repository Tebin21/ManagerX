import { getFirebaseFirestore, doc, getDoc, onSnapshot } from '@/lib/firebase';
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

  // 1. Check nested onlineStore object (used in employee_accounts & user_subscriptions when admin activates)
  if (
    data?.onlineStore?.enabled === true &&
    data?.onlineStore?.status === 'active' &&
    Boolean(data?.onlineStore?.subdomain)
  ) {
    return true;
  }

  // 2. Check store_activations collection doc (has top-level enabled: true, status: 'active', AND subdomain)
  if (
    data?.enabled === true &&
    data?.status === 'active' &&
    Boolean(data?.subdomain)
  ) {
    return true;
  }

  // 3. Fallback: only if storefront_enabled or onlineStoreActive is explicitly true AND subdomain exists
  if (
    (data?.storefront_enabled === true || data?.onlineStoreActive === true) &&
    Boolean(data?.onlineStore?.subdomain || data?.subdomain)
  ) {
    return true;
  }

  return false;
}

export async function isOnlineStoreActivatedByAdmin(forceRefresh = false): Promise<boolean> {
  const now = Date.now();
  if (!forceRefresh && isStoreActiveCache !== null && now - lastCheckTime < CACHE_TTL_MS) {
    return isStoreActiveCache;
  }

  // 1. Employee Account Check
  const { isEmployee, currentEmployeeAccount } = useManagementStore.getState();
  if (isEmployee) {
    const store = currentEmployeeAccount?.onlineStore;
    const active = !!(store?.enabled && store?.status === 'active');
    isStoreActiveCache = active;
    lastCheckTime = now;
    return active;
  }

  // 2. Manager / Owner Check
  const user = useAuthStore.getState().user;
  const email = user?.email?.trim().toLowerCase();
  if (!email) {
    isStoreActiveCache = false;
    lastCheckTime = now;
    return false;
  }

  try {
    const db = getFirebaseFirestore();
    const docId = email.replace(/[^a-z0-9_]/gi, '_');

    // Check employee_accounts (Admin management portal writes here for all accounts)
    const empSnap = await getDoc(doc(db, 'employee_accounts', docId));
    if (empSnap && (typeof empSnap.exists === 'function' ? empSnap.exists() : (empSnap as any).exists)) {
      const data = empSnap.data();
      if (parseStoreActiveFromData(data)) {
        isStoreActiveCache = true;
        lastCheckTime = now;
        return true;
      }
    }

    // Check user_subscriptions (Admin payment portal writes here)
    const subSnap = await getDoc(doc(db, 'user_subscriptions', docId));
    if (subSnap && (typeof subSnap.exists === 'function' ? subSnap.exists() : (subSnap as any).exists)) {
      const data = subSnap.data();
      if (parseStoreActiveFromData(data)) {
        isStoreActiveCache = true;
        lastCheckTime = now;
        return true;
      }
    }

    // Check store_activations
    const storeSnap = await getDoc(doc(db, 'store_activations', docId));
    if (storeSnap && (typeof storeSnap.exists === 'function' ? storeSnap.exists() : (storeSnap as any).exists)) {
      const data = storeSnap.data();
      if (parseStoreActiveFromData(data)) {
        isStoreActiveCache = true;
        lastCheckTime = now;
        return true;
      }
    }
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
  if (isEmployee && currentEmployeeAccount?.onlineStore) {
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
  const email = user?.email?.trim().toLowerCase();
  if (!email) return null;

  try {
    const db = getFirebaseFirestore();
    const docId = email.replace(/[^a-z0-9_]/gi, '_');

    // 1. Check store_activations (Primary online store activation record)
    const storeSnap = await getDoc(doc(db, 'store_activations', docId));
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
    const empSnap = await getDoc(doc(db, 'employee_accounts', docId));
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
    const subSnap = await getDoc(doc(db, 'user_subscriptions', docId));
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
          const { useOnlineStoreStore } = await import('@/store/onlineStoreStore');
          await useOnlineStoreStore.getState().syncWithSubscription(active);
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
