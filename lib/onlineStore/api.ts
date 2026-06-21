// Thin REST client for the Online Store backend (see online-store/server). Frontend
// (the public storefront, deployed to Vercel) and backend (the API, deployed separately
// — see online-store/README.md) live on different subdomains in production, so they're
// two distinct constants rather than one shared base URL.
//
// STORE_API_BASE_URL is where fetch() calls in this file actually go.
// Override both while developing against a backend/client running on your LAN.
export const STORE_API_BASE_URL = 'https://api.managerx.store';

// STORE_FRONTEND_BASE_URL is what the business owner sees, copies, and opens — the
// public storefront itself, not the API. Used by store/onlineStoreStore.ts to build the
// displayed/copied/opened URL (e.g. managerx.store/karwan-mobile).
export const STORE_FRONTEND_BASE_URL = 'https://managerx.store';

// Generates a placeholder slug from the business name so the store URL can be shown
// immediately — offline, before the backend has ever been reached. Mirrors
// online-store/server/src/routes/stores.ts's slugify() exactly, so the locally-shown
// guess matches what the backend will assign once registration actually succeeds
// (the backend only appends -2/-3 on an actual name collision with another business).
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'store';
}

export interface SyncChange {
  productId: number;
  operation: 'upsert' | 'delete';
  name?: string;
  price?: number;
  quantity?: number;
  imageUrl?: string | null;
  isPublished?: boolean;
  updatedAt?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${STORE_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Online Store request failed (${res.status}): ${body || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function authHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function registerStore(businessName: string): Promise<{ slug: string; apiKey: string }> {
  return request('/api/stores', {
    method: 'POST',
    body: JSON.stringify({ businessName }),
  });
}

export async function setStoreStatus(slug: string, apiKey: string, enabled: boolean): Promise<void> {
  await request(`/api/stores/${slug}/status`, {
    method: 'PATCH',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ enabled }),
  });
}

export async function pushSync(
  slug: string,
  apiKey: string,
  changes: SyncChange[]
): Promise<{ syncedAt: string; accepted: number }> {
  return request(`/api/stores/${slug}/sync`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ changes }),
  });
}
