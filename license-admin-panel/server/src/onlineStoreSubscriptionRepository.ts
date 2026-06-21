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
  /** Absolute ISO expiry date computed at generation time, or null = Lifetime. */
  expiresAt: string | null;
  status: SubscriptionStatus;
  notes: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

export type NewOnlineStoreSubscriptionInput = {
  customerName: string;
  phone: string;
  deviceId: string;
  plan: SubscriptionPlan;
  notes?: string;
};

export type OnlineStoreSubscriptionUpdateInput = Partial<
  Pick<OnlineStoreSubscriptionRecord, 'customerName' | 'phone' | 'notes'>
>;

// Swappable storage seam, same pattern as licenseRepository.ts — a different backing
// store can be dropped in later by implementing this same interface.
export interface OnlineStoreSubscriptionRepository {
  list(): Promise<OnlineStoreSubscriptionRecord[]>;
  get(id: string): Promise<OnlineStoreSubscriptionRecord | null>;
  // Takes the already-resolved subscriptionCode + expiresAt (computed by
  // onlineStoreSubscriptionCrypto.ts's signSubscription) — the repository itself
  // just stores what it's given.
  create(
    data: NewOnlineStoreSubscriptionInput & { subscriptionCode: string; expiresAt: string | null }
  ): Promise<OnlineStoreSubscriptionRecord>;
  update(id: string, data: OnlineStoreSubscriptionUpdateInput): Promise<OnlineStoreSubscriptionRecord | null>;
  setStatus(
    id: string,
    status: SubscriptionStatus,
    extra?: { revokedReason?: string | null }
  ): Promise<OnlineStoreSubscriptionRecord | null>;
  remove(id: string): Promise<boolean>;
}
