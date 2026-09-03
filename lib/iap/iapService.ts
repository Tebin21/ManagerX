import { Platform, Linking } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  getAvailablePurchases,
  getActiveSubscriptions,
  restorePurchases,
  deepLinkToSubscriptions,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
  type ProductSubscription,
  type ActiveSubscription,
  ErrorCode,
} from 'expo-iap';
import { MANAGE_SUBSCRIPTIONS_URL } from './iapConfig';

let isConnected = false;

/**
 * Initialize StoreKit connection.
 * Safe to call on all platforms — no-op on Web.
 */
export async function initIapConnection(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (isConnected) return true;

  try {
    const ok = await initConnection();
    isConnected = Boolean(ok);
    return isConnected;
  } catch (err) {
    console.warn('[Froshiar IAP] Failed to initialize StoreKit connection:', err);
    isConnected = false;
    return false;
  }
}

/**
 * Close StoreKit connection and free native resources.
 */
export async function endIapConnection(): Promise<void> {
  if (!isConnected || Platform.OS === 'web') return;
  try {
    await endConnection();
  } catch (err) {
    console.warn('[Froshiar IAP] Failed to close connection:', err);
  } finally {
    isConnected = false;
  }
}

/**
 * Fetch subscription products by SKU from the App Store.
 */
export async function fetchSubscriptions(skus: string[]): Promise<ProductSubscription[]> {
  if (Platform.OS === 'web' || skus.length === 0) return [];
  await initIapConnection();

  try {
    const products = await fetchProducts({
      skus,
      type: 'subs',
    });
    return (products as ProductSubscription[]) ?? [];
  } catch (err) {
    console.warn('[Froshiar IAP] fetchSubscriptions failed:', err);
    return [];
  }
}

/**
 * Request an auto-renewable subscription purchase from Apple.
 * Note: StoreKit purchases are asynchronous. Result arrives via purchaseUpdatedListener.
 */
export async function requestSubscriptionPurchase(sku: string): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('In-App Purchases are not supported on Web.');
  }
  await initIapConnection();

  await requestPurchase({
    request: {
      apple: { sku },
      google: { skus: [sku] },
    },
    type: 'subs',
  });
}

/**
 * Complete and acknowledge a transaction with Apple StoreKit.
 * Critical: un-finalized transactions replay on every app launch.
 */
export async function finalizePurchaseTransaction(purchase: Purchase): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await finishTransaction({ purchase, isConsumable: false });
  } catch (err) {
    console.warn('[Froshiar IAP] finishTransaction error:', err);
    throw err;
  }
}

/**
 * Query user's current entitlements directly from StoreKit.
 */
export async function fetchAvailablePurchases(): Promise<Purchase[]> {
  if (Platform.OS === 'web') return [];
  await initIapConnection();

  try {
    const purchases = await getAvailablePurchases({
      onlyIncludeActiveItemsIOS: true,
    });
    return purchases ?? [];
  } catch (err) {
    console.warn('[Froshiar IAP] getAvailablePurchases error:', err);
    return [];
  }
}

/**
 * Fetch detailed active subscriptions from StoreKit 2 (iOS).
 */
export async function fetchActiveSubscriptionsList(
  subscriptionIds?: string[]
): Promise<ActiveSubscription[]> {
  if (Platform.OS === 'web') return [];
  await initIapConnection();

  try {
    const active = await getActiveSubscriptions(subscriptionIds);
    return active ?? [];
  } catch (err) {
    console.warn('[Froshiar IAP] getActiveSubscriptions error:', err);
    return [];
  }
}

/**
 * Restore purchases by refreshing StoreKit state and returning available purchases.
 */
export async function restoreUserPurchases(): Promise<Purchase[]> {
  if (Platform.OS === 'web') return [];
  await initIapConnection();

  try {
    await restorePurchases();
    return await fetchAvailablePurchases();
  } catch (err) {
    console.warn('[Froshiar IAP] restorePurchases error:', err);
    throw err;
  }
}

/**
 * Open Apple Subscription Management sheet or system settings.
 */
export async function openSubscriptionManagement(): Promise<void> {
  if (Platform.OS === 'ios') {
    try {
      await deepLinkToSubscriptions({});
      return;
    } catch {
      // Fallback to standard Apple account subscriptions URL
    }
  }
  await Linking.openURL(MANAGE_SUBSCRIPTIONS_URL).catch(() => {});
}

/**
 * Register global purchase and error listeners.
 * Returns an unsubscription function.
 */
export function setupIapListeners(
  onPurchaseUpdated: (purchase: Purchase) => void | Promise<void>,
  onPurchaseError: (error: any) => void
): () => void {
  if (Platform.OS === 'web') return () => {};

  const subUpdated = purchaseUpdatedListener(async (purchase) => {
    try {
      await onPurchaseUpdated(purchase);
    } catch (err) {
      console.error('[Froshiar IAP] Listener handler threw:', err);
    }
  });

  const subError = purchaseErrorListener((error) => {
    const isCancelled =
      error?.code === ErrorCode.UserCancelled ||
      error?.message?.toLowerCase().includes('cancel');
    if (isCancelled) {
      // User cancelled sheet — normal flow, do not treat as failure
      return;
    }
    onPurchaseError(error);
  });

  return () => {
    subUpdated.remove();
    subError.remove();
  };
}
