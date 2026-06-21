import type { CustomerGroup, LicenseRecord, OnlineStoreSubscriptionRecord, Plan, SubscriptionPlan } from './types';

// Local-only app: this is always served from http://localhost:5173, talking to the
// API on http://localhost:4000 via Vite's dev proxy (see vite.config.ts) — so a
// plain relative '/api' path is all that's ever needed here.
export const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore — keep statusText
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  login: (password: string) => request<{ ok: true }>('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  checkSession: () => request<{ ok: true }>('/auth/check'),

  listLicenses: () => request<LicenseRecord[]>('/licenses'),
  getLicense: (id: string) => request<LicenseRecord>(`/licenses/${id}`),
  createLicense: (data: {
    customerName: string;
    phone: string;
    deviceId: string;
    plan: Plan;
    notes?: string;
    expiresInMonths?: number | null;
  }) => request<LicenseRecord>('/licenses', { method: 'POST', body: JSON.stringify(data) }),
  updateLicense: (id: string, data: Partial<Pick<LicenseRecord, 'customerName' | 'phone' | 'notes'>>) =>
    request<LicenseRecord>(`/licenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  revokeLicense: (id: string, reason?: string) =>
    request<LicenseRecord>(`/licenses/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason }) }),
  expireLicense: (id: string) => request<LicenseRecord>(`/licenses/${id}/expire`, { method: 'POST' }),
  reactivateLicense: (id: string) => request<LicenseRecord>(`/licenses/${id}/reactivate`, { method: 'POST' }),
  deleteLicense: (id: string) => request<void>(`/licenses/${id}`, { method: 'DELETE' }),

  listCustomers: () => request<CustomerGroup[]>('/customers'),

  listOnlineStoreSubscriptions: () => request<OnlineStoreSubscriptionRecord[]>('/online-store-subscriptions'),
  getOnlineStoreSubscription: (id: string) => request<OnlineStoreSubscriptionRecord>(`/online-store-subscriptions/${id}`),
  createOnlineStoreSubscription: (data: {
    customerName: string;
    phone: string;
    deviceId: string;
    plan: SubscriptionPlan;
    notes?: string;
  }) => request<OnlineStoreSubscriptionRecord>('/online-store-subscriptions', { method: 'POST', body: JSON.stringify(data) }),
  updateOnlineStoreSubscription: (
    id: string,
    data: Partial<Pick<OnlineStoreSubscriptionRecord, 'customerName' | 'phone' | 'notes'>>
  ) => request<OnlineStoreSubscriptionRecord>(`/online-store-subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  revokeOnlineStoreSubscription: (id: string, reason?: string) =>
    request<OnlineStoreSubscriptionRecord>(`/online-store-subscriptions/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reactivateOnlineStoreSubscription: (id: string) =>
    request<OnlineStoreSubscriptionRecord>(`/online-store-subscriptions/${id}/reactivate`, { method: 'POST' }),
  deleteOnlineStoreSubscription: (id: string) => request<void>(`/online-store-subscriptions/${id}`, { method: 'DELETE' }),
};
