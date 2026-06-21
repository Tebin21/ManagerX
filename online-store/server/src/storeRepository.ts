export interface StoreProduct {
  productId: number;
  name: string;
  category: string;
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
}

export interface StoreRecord {
  slug: string;
  businessName: string;
  enabled: boolean;
  apiKeyHash: string;
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
  isSlugTaken(slug: string): Promise<boolean>;
  create(data: { slug: string; businessName: string; apiKeyHash: string }): Promise<StoreRecord>;
  setEnabled(slug: string, enabled: boolean): Promise<StoreRecord | null>;
  updateInfo(slug: string, partialInfo: Partial<StoreInfo>): Promise<StoreRecord | null>;
  applySync(slug: string, changes: SyncChangeInput[]): Promise<{ syncedAt: string; accepted: number }>;
}
