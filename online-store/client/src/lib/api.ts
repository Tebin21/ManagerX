// In development, leave empty so Vite's dev proxy forwards /api to localhost:4100.
// In production, use VITE_API_BASE_URL or fallback to https://api.froshiar.store.
// Any stale reference to managerx.store is safely overridden.
const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
const isStaleDomain = rawBaseUrl.includes('managerx.store');

export const API_BASE_URL = import.meta.env.DEV
  ? (rawBaseUrl && !isStaleDomain ? rawBaseUrl : '')
  : (!rawBaseUrl || isStaleDomain ? 'https://api.froshiar.store' : rawBaseUrl);

// Read-only catalog shape — the server already filters out unpublished and
// out-of-stock products, so every product returned here is available to view.
export interface StoreProduct {
  productId: number;
  name: string;
  category: string;
  description: string | null;
  websiteDescription: string | null;
  price: number;
  imageUrl: string | null;
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

export interface StoreResponse {
  businessName: string;
  enabled: boolean;
  products: StoreProduct[];
  info: StoreInfo;
}

export async function fetchStore(slug: string): Promise<StoreResponse | null> {
  const res = await fetch(`${API_BASE_URL}/api/stores/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load store (${res.status})`);
  return res.json();
}
