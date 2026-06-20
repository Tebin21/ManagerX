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

export type NewLicenseInput = {
  customerName: string;
  phone: string;
  deviceId: string;
  plan: Plan;
  notes?: string;
};

export type LicenseUpdateInput = Partial<Pick<LicenseRecord, 'customerName' | 'phone' | 'notes'>>;

// Swappable storage seam: a SQLite/Supabase/Firebase-backed implementation can be
// dropped in later by implementing this same interface — no route/frontend changes.
export interface LicenseRepository {
  list(): Promise<LicenseRecord[]>;
  get(id: string): Promise<LicenseRecord | null>;
  create(data: NewLicenseInput & { licenseCode: string }): Promise<LicenseRecord>;
  update(id: string, data: LicenseUpdateInput): Promise<LicenseRecord | null>;
  setStatus(
    id: string,
    status: LicenseStatus,
    extra?: { revokedReason?: string | null }
  ): Promise<LicenseRecord | null>;
  remove(id: string): Promise<boolean>;
}
