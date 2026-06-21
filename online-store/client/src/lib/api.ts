// Frontend (this client, deployed to Vercel at managerx.store) and backend (deployed
// separately at api.managerx.store — see online-store/README.md) are different domains
// in production, so the API needs an absolute base URL, set via VITE_API_BASE_URL
// (see .env.example). With no env var set — the default for local dev — this falls back
// to a relative path, which Vite's dev proxy (vite.config.ts) forwards to :4100.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export interface StoreProduct {
  productId: number;
  name: string;
  category: string;
  price: number;
  /** Real stock count — used client-side to cap cart quantity, never rendered directly. */
  quantity: number;
  imageUrl: string | null;
  availability: 'in_stock' | 'out_of_stock';
}

export interface StoreInfo {
  description?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
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
