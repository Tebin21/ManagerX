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
  /** Absolute ISO expiry date computed at generation time, or null = permanent. */
  expiresAt: string | null;
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
  /** How many months the license should be valid for; null/0/undefined = permanent. */
  expiresInMonths?: number | null;
};

export type LicenseUpdateInput = Partial<Pick<LicenseRecord, 'customerName' | 'phone' | 'notes'>>;

// Swappable storage seam: a SQLite/Supabase/Firebase-backed implementation can be
// dropped in later by implementing this same interface — no route/frontend changes.
export interface LicenseRepository {
  list(): Promise<LicenseRecord[]>;
  get(id: string): Promise<LicenseRecord | null>;
  // Takes the already-resolved licenseCode + expiresAt (computed by crypto.ts's
  // signLicense, which is the only place that knows how to turn "N months" into a
  // date) — the repository itself just stores what it's given.
  create(
    data: Omit<NewLicenseInput, 'expiresInMonths'> & { licenseCode: string; expiresAt: string | null }
  ): Promise<LicenseRecord>;
  update(id: string, data: LicenseUpdateInput): Promise<LicenseRecord | null>;
  setStatus(
    id: string,
    status: LicenseStatus,
    extra?: { revokedReason?: string | null }
  ): Promise<LicenseRecord | null>;
  remove(id: string): Promise<boolean>;
}
