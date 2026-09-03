/**
 * Apple In-App Purchase / Auto-Renewable Subscriptions Configuration
 *
 * NOTE:
 * - "Froshiar Pro" and "Froshiar Store" are separate subscription groups.
 * - Do NOT merge them or assume they unlock the same features.
 */

export interface SubscriptionProductConfig {
  id: string;
  duration: '1month' | '6months' | '1year';
  group: 'pro' | 'store';
  defaultTitle: string;
}

// 1. Froshiar Pro Subscription Group (created in App Store Connect)
export const FROSHIAR_PRO_PRODUCTS = {
  monthly: 'com.froshiar.pro.monthly',
  sixMonths: 'com.froshiar.pro.6months',
  yearly: 'com.froshiar.pro.yearly',
} as const;

export const FROSHIAR_PRO_PRODUCT_IDS: string[] = [
  FROSHIAR_PRO_PRODUCTS.monthly,
  FROSHIAR_PRO_PRODUCTS.sixMonths,
  FROSHIAR_PRO_PRODUCTS.yearly,
];

/**
 * Item limits mapped strictly to each Froshiar Pro plan
 * Monthly: 200 items
 * 6 Months: 400 items
 * Yearly: 1000 items
 */
export const PRO_PLAN_ITEM_LIMITS: Record<string, number> = {
  [FROSHIAR_PRO_PRODUCTS.monthly]: 200,
  [FROSHIAR_PRO_PRODUCTS.sixMonths]: 400,
  [FROSHIAR_PRO_PRODUCTS.yearly]: 1000,
};

/**
 * Default free-plan item limit when no subscription or license is active.
 * Preserves the existing baseline from ITEM_LIMIT_PLANS[DEFAULT_ITEM_LIMIT_PLAN].
 */
export const DEFAULT_FREE_ITEM_LIMIT = 100;

export function getProItemLimit(productId: string | null | undefined): number {
  if (!productId) return DEFAULT_FREE_ITEM_LIMIT;
  return PRO_PLAN_ITEM_LIMITS[productId] ?? DEFAULT_FREE_ITEM_LIMIT;
}

/**
 * 2. Froshiar Store Subscription Group
 *
 * NOTE: App Store Connect Product IDs for the 3 Froshiar Store subscriptions
 * have not yet been provided. They will be populated once created in App Store Connect.
 * DO NOT guess or invent Product IDs.
 */
export const FROSHIAR_STORE_PRODUCTS = {
  monthly: '' as string,
  sixMonths: '' as string,
  yearly: '' as string,
};

// Filter out empty placeholders so StoreKit doesn't query blank IDs
export const FROSHIAR_STORE_PRODUCT_IDS: string[] = [
  FROSHIAR_STORE_PRODUCTS.monthly,
  FROSHIAR_STORE_PRODUCTS.sixMonths,
  FROSHIAR_STORE_PRODUCTS.yearly,
].filter((id) => Boolean(id && id.trim().length > 0));

export const ALL_SUBSCRIPTION_PRODUCT_IDS: string[] = [
  ...FROSHIAR_PRO_PRODUCT_IDS,
  ...FROSHIAR_STORE_PRODUCT_IDS,
];

export function isFroshiarProProduct(productId: string): boolean {
  return FROSHIAR_PRO_PRODUCT_IDS.includes(productId);
}

export function isFroshiarStoreProduct(productId: string): boolean {
  return FROSHIAR_STORE_PRODUCT_IDS.includes(productId);
}

// Legal Links required by App Store Review Guideline 3.1.2
export const EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const TERMS_OF_USE_URL = 'https://froshiar.store/terms';
export const PRIVACY_POLICY_URL = 'https://froshiar.store/privacy';
export const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
