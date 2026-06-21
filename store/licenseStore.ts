import { create } from 'zustand';
import {
  loadLicenseFromDb,
  activateLicense,
  ITEM_LIMIT_PLANS,
  DEFAULT_ITEM_LIMIT_PLAN,
  type ActivationResult,
} from '@/lib/itemLimit';

interface LicenseState {
  plan: string;
  limit: number;
  activatedAt: string | null;
  deviceId: string | null;
  licenseCode: string | null;
  expiresAt: string | null;
  expired: boolean;
  isLoaded: boolean;
  loadLicense: () => Promise<void>;
  activate: (code: string) => Promise<ActivationResult>;
}

export const useLicenseStore = create<LicenseState>((set) => ({
  plan: DEFAULT_ITEM_LIMIT_PLAN,
  limit: ITEM_LIMIT_PLANS[DEFAULT_ITEM_LIMIT_PLAN],
  activatedAt: null,
  deviceId: null,
  licenseCode: null,
  expiresAt: null,
  expired: false,
  isLoaded: false,

  loadLicense: async () => {
    const info = await loadLicenseFromDb();
    set({ ...info, isLoaded: true });
  },

  activate: async (code: string) => {
    const result = await activateLicense(code);
    if (result.status === 'activated') {
      // Re-load from DB rather than hand-assembling state, so deviceId/licenseCode/
      // activatedAt stay perfectly in sync with what was actually persisted.
      const info = await loadLicenseFromDb();
      set({ ...info, isLoaded: true });
    }
    return result;
  },
}));
