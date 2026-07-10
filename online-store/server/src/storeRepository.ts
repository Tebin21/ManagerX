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
  // Independent of the owner-facing `enabled` toggle above: an admin-suspended
  // store keeps its storefront rendering the last-synced catalog (matches the
  // "website stays online" rule) but every owner write route (info/sync/images,
  // and re-enabling) is blocked until an admin lifts the suspension.
  adminSuspended?: boolean;
  // Incremented on every accepted POST /:slug/sync call — feeds the admin
  // dashboard's "Total Sync Requests" stat. Never decremented/reset.
  syncCount?: number;
  // Snapshot of the most recent subscription check result, written by
  // subscriptionAuth.ts on every request that carries a subscription header —
  // NOT a second source of truth for authorization (the live Ed25519 check in
  // subscriptionAuth.ts remains the only thing that actually gates a request);
  // this is purely for the admin dashboard, which has no other way to know a
  // store's plan/expiry since subscription codes are generated externally and
  // never persisted anywhere else.
  subscriptionStatus?: 'valid' | 'invalid' | 'wrong_device' | 'expired' | 'missing';
  subscriptionPlan?: string;
  subscriptionExpiresAt?: string;
  subscriptionCheckedAt?: string;
}

// Permanent tombstone left behind by deleteStore() so a store's existence is
// never silently forgotten, even though its live record and uploaded images
// are gone for good — see deleteStore()'s own doc comment.
export interface DeletedStoreRecord {
  slug: string;
  businessName: string;
  deletedAt: string;
  productsCount: number;
}

export interface SubscriptionCheckResult {
  status: 'valid' | 'invalid' | 'wrong_device' | 'expired' | 'missing';
  plan?: string;
  expiresAt?: string;
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
  // Registration's full recover-or-create decision tree (recover by deviceId ->
  // claim a legacy store -> create new) collapsed into ONE atomic transaction:
  // one ledger read, one write, one lock acquisition. Composing the individual
  // methods below for this (as callers used to) does one separate read+write
  // cycle PER STEP, which both re-enters the (now non-reentrant) lock and
  // leaves a wider window for another concurrent request to interleave between
  // steps. Always prefer this over calling getByDeviceId/claimLegacyStore/
  // isSlugTaken/create yourself for a registration attempt.
  registerOrRecover(input: { businessName: string; deviceId?: string; apiKeyHash: string }): Promise<{ record: StoreRecord; recovered: boolean }>;
  // Issues a fresh credential for an already-existing store (recovery path). Touches
  // ONLY apiKeyHash — never slug/products/info/enabled/createdAt — deliberately kept
  // separate from updateInfo() so a credential rotation can never be reached through
  // the freeform info-merge body.
  rotateApiKey(slug: string, apiKeyHash: string): Promise<StoreRecord | null>;
  // One-time migration for a store created before deviceId tracking existed: attaches
  // deviceId + rotates the credential in one atomic step. Returns null (never claims
  // anything) if the slug doesn't exist, the record already has a deviceId, the
  // record was ever migrated before (`legacyMigratedAt` is a permanent, one-time-only
  // marker), or the 30-day legacy-migration window (anchored to this feature's ship
  // date) has closed — an already-owned/already-migrated store is never reassigned,
  // and businessName/slug matching is never usable to claim a store once the window
  // closes, full stop.
  claimLegacyStore(slug: string, deviceId: string, apiKeyHash: string): Promise<StoreRecord | null>;
  setEnabled(slug: string, enabled: boolean): Promise<StoreRecord | null>;
  updateInfo(slug: string, update: Partial<StoreInfo> & { businessName?: string }): Promise<StoreRecord | null>;
  applySync(slug: string, changes: SyncChangeInput[]): Promise<{ syncedAt: string; accepted: number }>;

  // --- Admin-only additions below (see online-store/server/src/routes/admin.ts) ---

  listAll(): Promise<StoreRecord[]>;
  setAdminSuspended(slug: string, suspended: boolean): Promise<StoreRecord | null>;
  // Best-effort — called from subscriptionAuth.ts on every subscription-header
  // check, valid or not, so the dashboard reflects the last-known state even
  // when a store's most recent request failed the check. Must never throw:
  // callers wrap this and log-not-rethrow so a logging failure can never turn
  // into a request failure for the actual store owner.
  recordSubscriptionCheck(slug: string, result: SubscriptionCheckResult): Promise<void>;
  // Hard delete: removes the record from the ledger entirely (its uploaded
  // images are removed separately by the admin route, which owns filesystem
  // access to the uploads dir). Writes a permanent tombstone to
  // data/deleted-stores.json first so the store's prior existence is never
  // silently lost — only ever called after a Super Admin has typed a literal
  // "DELETE" confirmation client-side AND the request body repeats it
  // server-side (see routes/admin.ts). Returns the tombstone, or null if the
  // slug didn't exist.
  deleteStore(slug: string): Promise<DeletedStoreRecord | null>;
  listDeletedStores(): Promise<DeletedStoreRecord[]>;
  // Wholesale overwrite used only by backup restore (routes/admin.ts) — goes
  // through the same lock as every other mutation so a restore can never
  // interleave with a concurrent store write and produce a mixed result.
  replaceAll(records: StoreRecord[], deletedRecords: DeletedStoreRecord[]): Promise<void>;
}
