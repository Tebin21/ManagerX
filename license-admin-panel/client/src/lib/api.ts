import type { CustomerGroup, LicenseRecord, Plan } from './types';

// Locally (no env var set) this resolves to '/api', which Vite's dev proxy forwards
// to the local server. In production, Vercel injects VITE_API_URL pointing straight
// at the Railway API, since the two are no longer on the same origin.
export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

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
  createLicense: (data: { customerName: string; phone: string; deviceId: string; plan: Plan; notes?: string }) =>
    request<LicenseRecord>('/licenses', { method: 'POST', body: JSON.stringify(data) }),
  updateLicense: (id: string, data: Partial<Pick<LicenseRecord, 'customerName' | 'phone' | 'notes'>>) =>
    request<LicenseRecord>(`/licenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  revokeLicense: (id: string, reason?: string) =>
    request<LicenseRecord>(`/licenses/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason }) }),
  expireLicense: (id: string) => request<LicenseRecord>(`/licenses/${id}/expire`, { method: 'POST' }),
  reactivateLicense: (id: string) => request<LicenseRecord>(`/licenses/${id}/reactivate`, { method: 'POST' }),
  deleteLicense: (id: string) => request<void>(`/licenses/${id}`, { method: 'DELETE' }),

  listCustomers: () => request<CustomerGroup[]>('/customers'),
};
