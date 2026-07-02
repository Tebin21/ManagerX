import 'server-only';

// Base URL of online-store/server (the Express API), and the shared secret
// that server's requireAdminAuth middleware expects — see
// online-store/server/src/adminAuth.ts. Both are server-only env vars, never
// exposed to the browser (no NEXT_PUBLIC_ prefix).
function backendUrl(): string {
  return process.env.ONLINE_STORE_API_URL ?? 'http://localhost:4100';
}

function adminApiKey(): string {
  const key = process.env.ONLINE_STORE_ADMIN_API_KEY;
  if (!key) {
    throw new Error('ONLINE_STORE_ADMIN_API_KEY is not set — see .env.local.example');
  }
  return key;
}

// Used directly by Server Components/pages for read-only data — skips the
// extra hop through this app's own /api/admin/[...path] proxy (that proxy
// exists for CLIENT Components to trigger mutations from the browser, which
// can't hold server-only secrets).
export async function fetchAdmin<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(new URL(path, backendUrl()), {
    ...init,
    headers: {
      Authorization: `Bearer ${adminApiKey()}`,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Backend request failed (${res.status} ${path}): ${body}`);
  }
  return res.json() as Promise<T>;
}

export function backendBaseUrl(): string {
  return backendUrl();
}

export function backendAdminApiKey(): string {
  return adminApiKey();
}
