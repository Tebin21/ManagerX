export interface StoreProduct {
  productId: number;
  name: string;
  category: string;
  description: string | null;
  websiteDescription: string | null;
  price: number;
  quantity: number;
  imageUrl: string | null;
  isPublished: boolean;
  updatedAt: string;
}

export interface StoreInfo {
  description?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  whatsappNumber?: string;
  themeColor?: string;
}

export interface StoreRecord {
  slug: string;
  businessName: string;
  enabled: boolean;
  apiKeyHash: string;
  // Stamped from the X-Device-Id header at registration time (hardware-derived, see
  // lib/deviceId.ts) so a later registration attempt from the same physical device
  // (e.g. after a reinstall wiped the locally-cached slug/apiKey) can be recognized as
  // a recovery of THIS record instead of creating a brand-new duplicate store.
  // Optional/absent on records created before this field existed.
  deviceId?: string;
  // Set only when deviceId above was assigned via the automatic legacy-migration path
  // (a store that existed before device-based recovery existed, not at normal creation
  // time) — pure audit trail for a human to check if a migration is ever disputed; no
  // code path branches on its presence.
  legacyMigratedAt?: string;
  createdAt: string;
  lastSyncAt: string | null;
  products: StoreProduct[];
  info?: StoreInfo;
}

export interface SyncChangeInput {
  productId: number;
  operation: 'upsert' | 'delete';
  name?: string;
  category?: string;
  description?: string | null;
  websiteDescription?: string | null;
  price?: number;
  quantity?: number;
  imageUrl?: string | null;
  isPublished?: boolean;
  updatedAt?: string;
}

// Swappable storage seam: a Postgres/Supabase-backed implementation can be dropped
// in later by implementing this same interface — no route changes needed. The
// default JsonStoreRepository keeps everything in one local ledger file, same
// philosophy as license-admin-panel's JsonLicenseRepository.
export interface StoreRepository {
  getBySlug(slug: string): Promise<StoreRecord | null>;
  // Looks up an existing store already owned by this device — used to recognize a
  // registration attempt as a recovery (same slug/products) rather than a fresh create.
  getByDeviceId(deviceId: string): Promise<StoreRecord | null>;
  isSlugTaken(slug: string): Promise<boolean>;
  create(data: { slug: string; businessName: string; apiKeyHash: string; deviceId?: string }): Promise<StoreRecord>;
  // Issues a fresh credential for an already-existing store (recovery path). Touches
  // ONLY apiKeyHash — never slug/products/info/enabled/createdAt — deliberately kept
  // separate from updateInfo() so a credential rotation can never be reached through
  // the freeform info-merge body.
  rotateApiKey(slug: string, apiKeyHash: string): Promise<StoreRecord | null>;
  // One-time migration for a store created before deviceId tracking existed: attaches
  // deviceId + rotates the credential in one atomic step. Returns null (never claims
  // anything) if the slug doesn't exist, OR if the record already has a deviceId —
  // an already-owned store must never be silently reassigned to a different device.
  claimLegacyStore(slug: string, deviceId: string, apiKeyHash: string): Promise<StoreRecord | null>;
  setEnabled(slug: string, enabled: boolean): Promise<StoreRecord | null>;
  updateInfo(slug: string, update: Partial<StoreInfo> & { businessName?: string }): Promise<StoreRecord | null>;
  applySync(slug: string, changes: SyncChangeInput[]): Promise<{ syncedAt: string; accepted: number }>;
}
