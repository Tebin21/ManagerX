import { Platform, AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';
import type { Purchase, ProductSubscription, ActiveSubscription } from 'expo-iap';
import {
  ALL_SUBSCRIPTION_PRODUCT_IDS,
  DEFAULT_FREE_ITEM_LIMIT,
  getProItemLimit,
  isFroshiarProProduct,
  isFroshiarStoreProduct,
} from '@/lib/iap/iapConfig';
import {
  initIapConnection,
  fetchSubscriptions,
  requestSubscriptionPurchase,
  finalizePurchaseTransaction,
  fetchAvailablePurchases,
  fetchActiveSubscriptionsList,
  restoreUserPurchases,
  setupIapListeners,
} from '@/lib/iap/iapService';
import { loadSetting, saveSetting } from '@/lib/sqlite';
import { useAuthStore } from '@/store/authStore';

export interface ProEntitlement {
  isActive: boolean;
  productId: string | null;
  expirationDate: string | null; // ISO 8601 string or null
  itemLimit: number;
  transactionId?: string | null;
  lastVerifiedAt?: number | null; // epoch ms
}

export interface StoreEntitlement {
  isActive: boolean;
  productId: string | null;
  expirationDate: string | null; // ISO 8601 string or null
  transactionId?: string | null;
  lastVerifiedAt?: number | null; // epoch ms
}

export const DEFAULT_PRO_ENTITLEMENT: ProEntitlement = {
  isActive: false,
  productId: null,
  expirationDate: null,
  itemLimit: DEFAULT_FREE_ITEM_LIMIT, // 100 items (existing free-plan baseline)
  transactionId: null,
  lastVerifiedAt: null,
};

export const DEFAULT_STORE_ENTITLEMENT: StoreEntitlement = {
  isActive: false,
  productId: null,
  expirationDate: null,
  transactionId: null,
  lastVerifiedAt: null,
};

function getCacheKeyPro(userId?: string | null): string {
  const uid = userId !== undefined ? userId : useAuthStore.getState().user?.id;
  return uid ? `iap_entitlement_pro_${uid}` : 'iap_entitlement_pro_guest';
}

function getCacheKeyStore(userId?: string | null): string {
  const uid = userId !== undefined ? userId : useAuthStore.getState().user?.id;
  return uid ? `iap_entitlement_store_${uid}` : 'iap_entitlement_store_guest';
}

function getTransactionOwnerKey(transactionId: string): string {
  return `iap_tx_owner_${transactionId}`;
}

function isExpirationValid(expirationDate: string | number | null): boolean {
  if (!expirationDate) return true;
  const expMs =
    typeof expirationDate === 'number'
      ? expirationDate
      : new Date(expirationDate).getTime();
  return !Number.isNaN(expMs) && expMs > Date.now();
}

function toIsoString(dateVal: string | number | null | undefined): string | null {
  if (!dateVal) return null;
  try {
    const d = typeof dateVal === 'number' ? new Date(dateVal) : new Date(dateVal);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

interface IapState {
  isInitialized: boolean;
  isLoadingProducts: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  products: Record<string, ProductSubscription>;
  proEntitlement: ProEntitlement;
  storeEntitlement: StoreEntitlement;
  errorMessage: string | null;

  // Actions
  initialize: (targetUserId?: string | null) => Promise<void>;
  loadProducts: () => Promise<void>;
  purchase: (productId: string) => Promise<void>;
  restore: () => Promise<{ success: boolean; hasPro: boolean; hasStore: boolean }>;
  refreshEntitlements: () => Promise<void>;
  clearUserSession: () => Promise<void>;
  clearError: () => void;
}

let listenerTeardown: (() => void) | null = null;
let appStateSub: { remove: () => void } | null = null;

export const useIapStore = create<IapState>((set, get) => ({
  isInitialized: false,
  isLoadingProducts: false,
  isPurchasing: false,
  isRestoring: false,
  products: {},
  proEntitlement: DEFAULT_PRO_ENTITLEMENT,
  storeEntitlement: DEFAULT_STORE_ENTITLEMENT,
  errorMessage: null,

  clearError: () => set({ errorMessage: null }),

  clearUserSession: async () => {
    // 1. Immediately reset in-memory state to isolated defaults
    set({
      proEntitlement: DEFAULT_PRO_ENTITLEMENT,
      storeEntitlement: DEFAULT_STORE_ENTITLEMENT,
      errorMessage: null,
      isPurchasing: false,
      isRestoring: false,
    });

    // 2. Invalidate dependent in-memory caches and reload license/store state
    try {
      const { invalidateLicenseCache } = await import('@/lib/itemLimit');
      invalidateLicenseCache();
      const { useLicenseStore } = await import('@/store/licenseStore');
      await useLicenseStore.getState().loadLicense();

      const { invalidateSubscriptionCache } = await import(
        '@/lib/onlineStoreSubscription/subscription'
      );
      invalidateSubscriptionCache();
      const { useOnlineStoreSubscriptionStore } = await import(
        '@/store/onlineStoreSubscriptionStore'
      );
      await useOnlineStoreSubscriptionStore.getState().loadSubscription();

      const { useOnlineStoreStore } = await import('@/store/onlineStoreStore');
      await useOnlineStoreStore.getState().syncWithSubscription(false);
    } catch (e) {
      if (__DEV__) console.warn('[Froshiar IAP] clearUserSession sync error:', e);
    }
  },

  initialize: async (targetUserId?: string | null) => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    const currentUserId =
      targetUserId !== undefined ? targetUserId : useAuthStore.getState().user?.id;

    // 1. Load user-scoped cached entitlements from SQLite for instant offline availability
    try {
      const cachedPro = await loadSetting(getCacheKeyPro(currentUserId));
      const cachedStore = await loadSetting(getCacheKeyStore(currentUserId));

      if (cachedPro) {
        const parsed: ProEntitlement = JSON.parse(cachedPro);
        if (parsed.isActive && isExpirationValid(parsed.expirationDate)) {
          // Guarantee accurate plan-specific item limit (never Infinity or 0)
          const limit = getProItemLimit(parsed.productId);
          set({
            proEntitlement: {
              ...parsed,
              itemLimit: limit,
            },
          });
        } else {
          set({ proEntitlement: DEFAULT_PRO_ENTITLEMENT });
        }
      } else {
        set({ proEntitlement: DEFAULT_PRO_ENTITLEMENT });
      }

      if (cachedStore) {
        const parsed: StoreEntitlement = JSON.parse(cachedStore);
        if (parsed.isActive && isExpirationValid(parsed.expirationDate)) {
          set({ storeEntitlement: parsed });
        } else {
          set({ storeEntitlement: DEFAULT_STORE_ENTITLEMENT });
        }
      } else {
        set({ storeEntitlement: DEFAULT_STORE_ENTITLEMENT });
      }
    } catch (e) {
      console.warn('[Froshiar IAP] Failed to read user-scoped cached entitlements:', e);
    }

    // 2. Synchronize dependent licenseStore immediately with current entitlement
    try {
      const { invalidateLicenseCache } = await import('@/lib/itemLimit');
      invalidateLicenseCache();
      const { useLicenseStore } = await import('@/store/licenseStore');
      await useLicenseStore.getState().loadLicense();
    } catch {}

    // 3. Register StoreKit purchase listeners once
    if (!listenerTeardown) {
      listenerTeardown = setupIapListeners(
        async (purchase: Purchase) => {
          await handlePurchaseCompleted(purchase, set, get);
        },
        (error: any) => {
          console.warn('[Froshiar IAP] Purchase error received:', error);
          set({
            isPurchasing: false,
            errorMessage: error?.message ?? 'Purchase could not be completed.',
          });
        }
      );
    }

    // 4. Register AppState foreground listener to refresh live entitlements on resume
    if (!appStateSub) {
      appStateSub = AppState.addEventListener('change', (status: AppStateStatus) => {
        if (status === 'active') {
          void get().refreshEntitlements();
        }
      });
    }

    // 5. Connect to StoreKit
    const connected = await initIapConnection();
    if (!connected) return;

    set({ isInitialized: true });

    // 6. Fetch products and check live entitlements in background
    void get().loadProducts();
    void get().refreshEntitlements();
  },

  loadProducts: async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    set({ isLoadingProducts: true });

    try {
      const allSkus = ALL_SUBSCRIPTION_PRODUCT_IDS;
      if (allSkus.length === 0) {
        set({ isLoadingProducts: false });
        return;
      }

      const subs = await fetchSubscriptions(allSkus);
      const productMap: Record<string, ProductSubscription> = {};
      for (const sub of subs) {
        if (sub.id) {
          productMap[sub.id] = sub;
        }
      }

      set({ products: productMap, isLoadingProducts: false });
    } catch (e: any) {
      console.warn('[Froshiar IAP] loadProducts failed:', e);
      set({ isLoadingProducts: false });
    }
  },

  purchase: async (productId: string) => {
    set({ isPurchasing: true, errorMessage: null });
    try {
      await requestSubscriptionPurchase(productId);
      // Result handled asynchronously by purchaseUpdatedListener -> handlePurchaseCompleted
    } catch (e: any) {
      console.warn('[Froshiar IAP] Purchase request rejected:', e);
      set({
        isPurchasing: false,
        errorMessage: e?.message ?? 'Failed to initiate purchase.',
      });
      throw e;
    }
  },

  restore: async () => {
    set({ isRestoring: true, errorMessage: null });
    try {
      const purchases = await restoreUserPurchases();
      // On explicit Restore, claim found active purchases for the currently signed-in user
      await evaluatePurchasesAndUpdate(purchases, set, true);

      const state = get();
      set({ isRestoring: false });
      return {
        success: true,
        hasPro: state.proEntitlement.isActive,
        hasStore: state.storeEntitlement.isActive,
      };
    } catch (e: any) {
      console.warn('[Froshiar IAP] Restore purchases failed:', e);
      set({
        isRestoring: false,
        errorMessage: e?.message ?? 'Failed to restore purchases.',
      });
      return {
        success: false,
        hasPro: get().proEntitlement.isActive,
        hasStore: get().storeEntitlement.isActive,
      };
    }
  },

  refreshEntitlements: async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    try {
      // 1. Try StoreKit 2 granular active subscriptions
      const activeSubs = await fetchActiveSubscriptionsList();
      if (activeSubs.length > 0) {
        await evaluateActiveSubscriptionsAndUpdate(activeSubs, set);
        return;
      }

      // 2. Fallback to getAvailablePurchases
      const available = await fetchAvailablePurchases();
      await evaluatePurchasesAndUpdate(available, set, false);
    } catch (e) {
      console.warn('[Froshiar IAP] refreshEntitlements error:', e);
    }
  },
}));

async function notifyEntitlementsChanged(proActive: boolean, storeActive: boolean) {
  try {
    const { invalidateLicenseCache } = await import('@/lib/itemLimit');
    invalidateLicenseCache();
    const { useLicenseStore } = await import('@/store/licenseStore');
    await useLicenseStore.getState().loadLicense();

    const { invalidateSubscriptionCache } = await import(
      '@/lib/onlineStoreSubscription/subscription'
    );
    invalidateSubscriptionCache();
    const { useOnlineStoreSubscriptionStore } = await import(
      '@/store/onlineStoreSubscriptionStore'
    );
    await useOnlineStoreSubscriptionStore.getState().loadSubscription();

    const { useOnlineStoreStore } = await import('@/store/onlineStoreStore');
    await useOnlineStoreStore.getState().syncWithSubscription(storeActive);
  } catch (err) {
    if (__DEV__) console.warn('[Froshiar IAP] notifyEntitlementsChanged error:', err);
  }
}

async function handlePurchaseCompleted(
  purchase: Purchase,
  set: (state: Partial<IapState>) => void,
  get: () => IapState
) {
  try {
    // CRITICAL GUARD: Only finalize when purchaseState is confirmed as 'purchased'
    // Do NOT finalize pending / deferred ("Ask to Buy" parental approval) transactions
    if (purchase.purchaseState !== 'purchased') {
      if (__DEV__) {
        console.log('[Froshiar IAP] Purchase state is deferred/pending:', purchase.purchaseState);
      }
      set({ isPurchasing: false });
      return;
    }

    const sku = purchase.productId;
    const now = Date.now();
    const currentUserId = useAuthStore.getState().user?.id;
    const txId = purchase.id ?? purchase.transactionId ?? `tx_${now}`;

    // Acknowledge/finalize with StoreKit so Apple marks transaction finished
    await finalizePurchaseTransaction(purchase);

    if (isFroshiarProProduct(sku)) {
      const itemLimit = getProItemLimit(sku);
      const entitlement: ProEntitlement = {
        isActive: true,
        productId: sku,
        expirationDate: null,
        itemLimit,
        transactionId: txId,
        lastVerifiedAt: now,
      };

      set({ proEntitlement: entitlement, isPurchasing: false });
      await saveSetting(getCacheKeyPro(currentUserId), JSON.stringify(entitlement));
      if (currentUserId) {
        await saveSetting(getTransactionOwnerKey(txId), currentUserId);
      }

      await notifyEntitlementsChanged(true, get().storeEntitlement.isActive);
    } else if (isFroshiarStoreProduct(sku)) {
      const entitlement: StoreEntitlement = {
        isActive: true,
        productId: sku,
        expirationDate: null,
        transactionId: txId,
        lastVerifiedAt: now,
      };

      set({ storeEntitlement: entitlement, isPurchasing: false });
      await saveSetting(getCacheKeyStore(currentUserId), JSON.stringify(entitlement));
      if (currentUserId) {
        await saveSetting(getTransactionOwnerKey(txId), currentUserId);
      }

      await notifyEntitlementsChanged(get().proEntitlement.isActive, true);
    } else {
      set({ isPurchasing: false });
    }
  } catch (err: any) {
    console.error('[Froshiar IAP] Error handling completed purchase:', err);
    set({
      isPurchasing: false,
      errorMessage: err?.message ?? 'Could not finalize purchase.',
    });
  }
}

async function evaluateActiveSubscriptionsAndUpdate(
  activeSubs: ActiveSubscription[],
  set: (state: Partial<IapState>) => void
) {
  const now = Date.now();
  const currentUserId = useAuthStore.getState().user?.id;
  let foundPro: ActiveSubscription | null = null;
  let foundStore: ActiveSubscription | null = null;

  for (const sub of activeSubs) {
    if (!sub.isActive) continue;
    if (sub.expirationDateIOS && sub.expirationDateIOS < now) continue;

    if (isFroshiarProProduct(sub.productId)) {
      foundPro = sub;
    } else if (isFroshiarStoreProduct(sub.productId)) {
      foundStore = sub;
    }
  }

  // Account Isolation Check:
  // If the device has a transaction owned by another account, do not grant automatically
  // unless owned by current account or explicitly restored.
  let shouldGrantPro = Boolean(foundPro);
  if (foundPro && foundPro.transactionId && currentUserId) {
    const owner = await loadSetting(getTransactionOwnerKey(foundPro.transactionId));
    if (owner && owner !== currentUserId) {
      shouldGrantPro = false;
    }
  }

  let shouldGrantStore = Boolean(foundStore);
  if (foundStore && foundStore.transactionId && currentUserId) {
    const owner = await loadSetting(getTransactionOwnerKey(foundStore.transactionId));
    if (owner && owner !== currentUserId) {
      shouldGrantStore = false;
    }
  }

  let proEnt: ProEntitlement;
  if (foundPro && shouldGrantPro) {
    const itemLimit = getProItemLimit(foundPro.productId);
    proEnt = {
      isActive: true,
      productId: foundPro.productId,
      expirationDate: toIsoString(foundPro.expirationDateIOS),
      itemLimit,
      transactionId: foundPro.transactionId ?? null,
      lastVerifiedAt: now,
    };
  } else {
    proEnt = {
      ...DEFAULT_PRO_ENTITLEMENT,
      lastVerifiedAt: now,
    };
  }
  set({ proEntitlement: proEnt });
  await saveSetting(getCacheKeyPro(currentUserId), JSON.stringify(proEnt));

  let storeEnt: StoreEntitlement;
  if (foundStore && shouldGrantStore) {
    storeEnt = {
      isActive: true,
      productId: foundStore.productId,
      expirationDate: toIsoString(foundStore.expirationDateIOS),
      transactionId: foundStore.transactionId ?? null,
      lastVerifiedAt: now,
    };
  } else {
    storeEnt = {
      ...DEFAULT_STORE_ENTITLEMENT,
      lastVerifiedAt: now,
    };
  }
  set({ storeEntitlement: storeEnt });
  await saveSetting(getCacheKeyStore(currentUserId), JSON.stringify(storeEnt));

  await notifyEntitlementsChanged(proEnt.isActive, storeEnt.isActive);
}

async function evaluatePurchasesAndUpdate(
  purchases: Purchase[],
  set: (state: Partial<IapState>) => void,
  isExplicitRestore: boolean = false
) {
  const now = Date.now();
  const currentUserId = useAuthStore.getState().user?.id;
  let foundPro: Purchase | null = null;
  let foundStore: Purchase | null = null;

  for (const p of purchases) {
    if (p.purchaseState !== 'purchased') continue;

    if (isFroshiarProProduct(p.productId)) {
      foundPro = p;
    } else if (isFroshiarStoreProduct(p.productId)) {
      foundStore = p;
    }
  }

  // Account Isolation Check
  let shouldGrantPro = Boolean(foundPro);
  const proTxId = foundPro?.id ?? foundPro?.transactionId;
  if (foundPro && proTxId && currentUserId) {
    const owner = await loadSetting(getTransactionOwnerKey(proTxId));
    if (isExplicitRestore) {
      // Restore transfers/claims the purchase for this account
      await saveSetting(getTransactionOwnerKey(proTxId), currentUserId);
      shouldGrantPro = true;
    } else if (owner && owner !== currentUserId) {
      shouldGrantPro = false;
    }
  }

  let shouldGrantStore = Boolean(foundStore);
  const storeTxId = foundStore?.id ?? foundStore?.transactionId;
  if (foundStore && storeTxId && currentUserId) {
    const owner = await loadSetting(getTransactionOwnerKey(storeTxId));
    if (isExplicitRestore) {
      await saveSetting(getTransactionOwnerKey(storeTxId), currentUserId);
      shouldGrantStore = true;
    } else if (owner && owner !== currentUserId) {
      shouldGrantStore = false;
    }
  }

  let proEnt: ProEntitlement;
  if (foundPro && shouldGrantPro) {
    const itemLimit = getProItemLimit(foundPro.productId);
    proEnt = {
      isActive: true,
      productId: foundPro.productId,
      expirationDate: null,
      itemLimit,
      transactionId: proTxId ?? null,
      lastVerifiedAt: now,
    };
  } else {
    proEnt = {
      ...DEFAULT_PRO_ENTITLEMENT,
      lastVerifiedAt: now,
    };
  }
  set({ proEntitlement: proEnt });
  await saveSetting(getCacheKeyPro(currentUserId), JSON.stringify(proEnt));

  let storeEnt: StoreEntitlement;
  if (foundStore && shouldGrantStore) {
    storeEnt = {
      isActive: true,
      productId: foundStore.productId,
      expirationDate: null,
      transactionId: storeTxId ?? null,
      lastVerifiedAt: now,
    };
  } else {
    storeEnt = {
      ...DEFAULT_STORE_ENTITLEMENT,
      lastVerifiedAt: now,
    };
  }
  set({ storeEntitlement: storeEnt });
  await saveSetting(getCacheKeyStore(currentUserId), JSON.stringify(storeEnt));

  await notifyEntitlementsChanged(proEnt.isActive, storeEnt.isActive);
}
