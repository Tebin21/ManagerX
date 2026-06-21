// Thin REST client for the Online Store backend (see online-store/server). The base URL
// points at the real production domain by default; override STORE_API_BASE_URL to test
// against a backend running locally on your LAN while developing.
export const STORE_API_BASE_URL = 'https://store.managerx.app';

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
