export type Plan = 'basic' | 'plus' | 'pro' | 'business' | 'unlimited';
export type LicenseStatus = 'active' | 'revoked' | 'expired';

export interface LicenseRecord {
  id: string;
  customerName: string;
  phone: string;
  deviceId: string;
  licenseCode: string;
  plan: Plan;
  createdAt: string;
  activatedAt: string | null;
  status: LicenseStatus;
  notes: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface CustomerGroup {
  phone: string;
  customerName: string;
  devices: string[];
  planHistory: { plan: Plan; createdAt: string; status: LicenseStatus }[];
  licenses: LicenseRecord[];
}

export const PLAN_LABELS: Record<Plan, string> = {
  basic: 'Basic',
  plus: 'Plus',
  pro: 'Pro',
  business: 'Business',
  unlimited: 'Unlimited',
};

export const PLAN_LIMITS: Record<Plan, string> = {
  basic: '100 items',
  plus: '200 items',
  pro: '600 items',
  business: '1,000 items',
  unlimited: 'Unlimited items',
};
