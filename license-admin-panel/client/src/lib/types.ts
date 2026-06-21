export type Plan = 'basic' | 'plus' | 'pro' | 'business' | 'unlimited';
export type LicenseStatus = 'active' | 'revoked' | 'expired';

export interface LicenseRecord {
  id: string;
  customerName: string;
  phone: string;
  deviceId: string;
  licenseCode: string;
  plan: Plan;
  createdAt: string;
  activatedAt: string | null;
  /** Absolute ISO expiry date, or null = permanent. */
  expiresAt: string | null;
  status: LicenseStatus;
  notes: string;
  revokedAt: string | null;
  revokedReason: string | null;
  /** Server-computed: true when status is still "active" but expiresAt has passed. */
  isExpired: boolean;
}

export interface CustomerGroup {
  phone: string;
  customerName: string;
  devices: string[];
  planHistory: { plan: Plan; createdAt: string; status: LicenseStatus }[];
  licenses: LicenseRecord[];
}

export const PLAN_LABELS: Record<Plan, string> = {
  basic: 'Basic',
  plus: 'Plus',
  pro: 'Pro',
  business: 'Business',
  unlimited: 'Unlimited',
};

export const PLAN_LIMITS: Record<Plan, string> = {
  basic: '100 items',
  plus: '200 items',
  pro: '600 items',
  business: '1,000 items',
  unlimited: 'Unlimited items',
};

// Online Store Subscription — a completely independent product from the ManagerX
// item-limit license above (separate keypair/storage/validation server-side). Plans
// here are purely time-based, not item-limit-based.
export type SubscriptionPlan = '1m' | '3m' | '6m' | '12m' | 'lifetime';
export type SubscriptionStatus = 'active' | 'revoked' | 'expired';

export interface OnlineStoreSubscriptionRecord {
  id: string;
  customerName: string;
  phone: string;
  deviceId: string;
  subscriptionCode: string;
  plan: SubscriptionPlan;
  createdAt: string;
  activatedAt: string | null;
  /** Absolute ISO expiry date, or null = Lifetime. */
  expiresAt: string | null;
  status: SubscriptionStatus;
  notes: string;
  revokedAt: string | null;
  revokedReason: string | null;
  isExpired: boolean;
}

export const SUBSCRIPTION_PLAN_LABELS: Record<SubscriptionPlan, string> = {
  '1m': '1 Month',
  '3m': '3 Months',
  '6m': '6 Months',
  '12m': '12 Months',
  lifetime: 'Lifetime',
};
