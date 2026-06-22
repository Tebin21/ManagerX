import { getOnlineStoreSubscriptionHeaders } from '@/lib/onlineStoreSubscription/subscription';

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
  category?: string;
  description?: string | null;
  price?: number;
  quantity?: number;
  imageUrl?: string | null;
  isPublished?: boolean;
  updatedAt?: string;
}

// Carries the HTTP status so callers (syncEngine.ts) can tell "this store no longer
// exists on the backend" (404 — re-register automatically) apart from "transient
// network/server failure" (anything else — just retry later). A plain Error lost
// this distinction, which is why a stale registration used to retry the exact same
// doomed request forever instead of recovering.
export class OnlineStoreApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'OnlineStoreApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET';
  if (__DEV__) console.log(`[onlineStore] → ${method} ${path}`, init?.body ?? '');
  const res = await fetch(`${STORE_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (__DEV__) console.warn(`[onlineStore] ← ${method} ${path} FAILED (${res.status}):`, body);
    throw new OnlineStoreApiError(
      `${method} ${path} failed (${res.status}): ${body || res.statusText}`,
      res.status
    );
  }
  if (res.status === 204) {
    if (__DEV__) console.log(`[onlineStore] ← ${method} ${path} OK (204)`);
    return undefined as T;
  }
  const json = await res.json();
  if (__DEV__) console.log(`[onlineStore] ← ${method} ${path} OK:`, json);
  return json as T;
}

function authHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}` };
}

// Online Store Subscription proof — read fresh on every call rather than cached, so
// an in-app activation takes effect on the very next request with no extra plumbing.
// Returns {} (not empty-string headers) when nothing is stored, so the backend's
// "missing" status is reported accurately rather than "invalid".
async function subscriptionHeaders(): Promise<Record<string, string>> {
  const sub = await getOnlineStoreSubscriptionHeaders();
  if (!sub) return {};
  return { 'X-OSS-Subscription': sub.code, 'X-Device-Id': sub.deviceId };
}

export async function registerStore(businessName: string): Promise<{ slug: string; apiKey: string }> {
  return request('/api/stores', {
    method: 'POST',
    headers: await subscriptionHeaders(),
    body: JSON.stringify({ businessName }),
  });
}

// Sent unconditionally, even when disabling — the backend only actually checks these
// headers when `enabled:true` is requested; disabling must always succeed regardless
// of subscription state, and it's simpler for the client to always attach them than
// to mirror the server's conditional logic here.
export async function setStoreStatus(slug: string, apiKey: string, enabled: boolean): Promise<void> {
  await request(`/api/stores/${slug}/status`, {
    method: 'PATCH',
    headers: { ...authHeaders(apiKey), ...(await subscriptionHeaders()) },
    body: JSON.stringify({ enabled }),
  });
}

export interface StoreInfoPayload {
  businessName?: string;
  description?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
}

export async function pushStoreInfo(slug: string, apiKey: string, info: StoreInfoPayload): Promise<void> {
  await request(`/api/stores/${slug}/info`, {
    method: 'PATCH',
    headers: { ...authHeaders(apiKey), ...(await subscriptionHeaders()) },
    body: JSON.stringify(info),
  });
}

export async function pushSync(
  slug: string,
  apiKey: string,
  changes: SyncChange[]
): Promise<{ syncedAt: string; accepted: number }> {
  return request(`/api/stores/${slug}/sync`, {
    method: 'POST',
    headers: { ...authHeaders(apiKey), ...(await subscriptionHeaders()) },
    body: JSON.stringify({ changes }),
  });
}

// Uploads a local product/logo image to the Online Store backend's own persistent
// disk and returns its public URL. Deliberately NOT routed through request() —
// that helper force-sets Content-Type: application/json, but React Native's
// fetch+FormData needs to set its own multipart boundary automatically.
export async function uploadStoreImage(
  slug: string,
  apiKey: string,
  localUri: string
): Promise<{ url: string }> {
  const ext = (localUri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const form = new FormData();
  form.append('image', { uri: localUri, name: `upload.${ext}`, type: mime } as unknown as Blob);

  if (__DEV__) console.log(`[onlineStore] → POST /api/stores/${slug}/images (${localUri})`);
  const res = await fetch(`${STORE_API_BASE_URL}/api/stores/${slug}/images`, {
    method: 'POST',
    headers: { ...authHeaders(apiKey), ...(await subscriptionHeaders()) },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (__DEV__) console.warn(`[onlineStore] ← image upload FAILED (${res.status}):`, body);
    throw new OnlineStoreApiError(`Image upload failed (${res.status}): ${body || res.statusText}`, res.status);
  }
  const json = await res.json();
  if (__DEV__) console.log('[onlineStore] ← image upload OK:', json);
  return json;
}
