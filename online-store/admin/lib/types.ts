// Mirrors online-store/server/src/storeRepository.ts + routes/admin.ts's
// response shapes (toSummary()/detail endpoint) — kept in sync by hand since
// the two projects don't share a build step.

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

export type SubscriptionStatus = 'valid' | 'invalid' | 'wrong_device' | 'expired' | 'missing';

export interface StoreSummary {
  slug: string;
  businessName: string;
  enabled: boolean;
  deviceId?: string;
  legacyMigratedAt?: string;
  createdAt: string;
  lastSyncAt: string | null;
  info?: StoreInfo;
  adminSuspended?: boolean;
  syncCount?: number;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: string;
  subscriptionCheckedAt?: string;
  productsCount: number;
  categoriesCount: number;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  actor: 'admin' | 'owner' | 'system';
  ip: string;
  action: string;
  slug?: string;
  details?: string;
}

export interface StoreDetail extends StoreSummary {
  products: StoreProduct[];
  storageUsageBytes: number;
  recentActivity: ActivityEntry[];
}

export interface DeletedStoreRecord {
  slug: string;
  businessName: string;
  deletedAt: string;
  productsCount: number;
}

export interface BackupSummary {
  id: string;
  createdAt: string;
  sizeBytes: number;
}
