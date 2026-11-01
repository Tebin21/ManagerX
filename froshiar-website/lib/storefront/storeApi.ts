export const STORE_API_BASE_URL = 'https://api.froshiar.store';

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
  telegramUrl?: string;
  snapchatUrl?: string;
  themeColor?: string;
}

export interface StoreResponse {
  businessName: string;
  enabled: boolean;
  products: StoreProduct[];
  info: StoreInfo;
}

export async function fetchStorefront(slug: string): Promise<StoreResponse | null> {
  const clean = (slug || '').trim().toLowerCase();
  try {
    const res = await fetch(`${STORE_API_BASE_URL}/api/stores/${encodeURIComponent(clean)}`, {
      next: { revalidate: 10 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to load store (${res.status})`);
    return await res.json();
  } catch (err) {
    console.error(`[fetchStorefront] Error fetching ${clean}:`, err);
    throw err;
  }
}
