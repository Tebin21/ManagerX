import { getFirebaseFirestore, doc, getDoc } from '@/lib/firebase';
import { useManagementStore } from '@/store/managementStore';
import { useAuthStore } from '@/store/authStore';

let isStoreActiveCache: boolean | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 15_000;

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

  // Demo user preview exception if specifically demo@froshiar.store
  if (email === 'demo@froshiar.store') {
    isStoreActiveCache = true;
    lastCheckTime = now;
    return true;
  }

  try {
    const db = getFirebaseFirestore();
    const docId = email.replace(/[^a-z0-9_]/gi, '_');

    // Check employee_accounts (Admin management portal writes here for all accounts)
    const empSnap = await getDoc(doc(db, 'employee_accounts', docId));
    if (empSnap && (typeof empSnap.exists === 'function' ? empSnap.exists() : (empSnap as any).exists)) {
      const data = empSnap.data();
      if (data?.onlineStore?.enabled && data?.onlineStore?.status === 'active') {
        isStoreActiveCache = true;
        lastCheckTime = now;
        return true;
      }
    }

    // Check user_subscriptions (Admin payment portal writes here)
    const subSnap = await getDoc(doc(db, 'user_subscriptions', docId));
    if (subSnap && (typeof subSnap.exists === 'function' ? subSnap.exists() : (subSnap as any).exists)) {
      const data = subSnap.data();
      if (
        data?.status === 'active' &&
        (data?.storefront_enabled === true || data?.onlineStoreActive === true || data?.onlineStore?.status === 'active')
      ) {
        isStoreActiveCache = true;
        lastCheckTime = now;
        return true;
      }
    }

    // Check store_activations
    const storeSnap = await getDoc(doc(db, 'store_activations', docId));
    if (storeSnap && (typeof storeSnap.exists === 'function' ? storeSnap.exists() : (storeSnap as any).exists)) {
      const data = storeSnap.data();
      if (data?.enabled === true && data?.status === 'active') {
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

export function invalidateStoreActivationCache(): void {
  isStoreActiveCache = null;
  lastCheckTime = 0;
}

