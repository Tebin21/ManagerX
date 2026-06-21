// Same-origin in production (this client's build output is served by the Express
// server itself — see online-store/server/src/index.ts). In dev, Vite's proxy
// (vite.config.ts) forwards /api to the server running on :4100.
export interface StoreProduct {
  productId: number;
  name: string;
  price: number;
  imageUrl: string | null;
  availability: 'in_stock' | 'out_of_stock';
}

export interface StoreResponse {
  businessName: string;
  enabled: boolean;
  products: StoreProduct[];
}

export async function fetchStore(slug: string): Promise<StoreResponse | null> {
  const res = await fetch(`/api/stores/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load store (${res.status})`);
  return res.json();
}
