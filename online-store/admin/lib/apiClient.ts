"use client";

// Thin client-side helpers hitting this app's own /api/admin/[...path] proxy
// (see that route's comment) — never calls online-store/server directly,
// since only the server holds ONLINE_STORE_ADMIN_API_KEY.

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export function setStoreSuspended(slug: string, suspended: boolean) {
  return call(`/stores/${slug}/suspend`, { method: "PATCH", body: JSON.stringify({ suspended }) });
}

export function resetStoreApiKey(slug: string) {
  return call<{ slug: string; apiKey: string }>(`/stores/${slug}/reset-key`, { method: "POST" });
}

export function deleteStore(slug: string) {
  return call(`/stores/${slug}`, { method: "DELETE", body: JSON.stringify({ confirm: "DELETE" }) });
}

export function updateStoreInfo(slug: string, update: Record<string, unknown>) {
  return call(`/stores/${slug}/info`, { method: "PATCH", body: JSON.stringify(update) });
}

export function createBackup() {
  return call<{ id: string }>("/backups", { method: "POST" });
}

export function restoreBackup(id: string) {
  return call(`/backups/${id}/restore`, { method: "POST", body: JSON.stringify({ confirm: "RESTORE" }) });
}
