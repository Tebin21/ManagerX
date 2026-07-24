import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { migratedAsyncStorage } from '@/lib/migratedStorage';

interface BusinessData {
  name: string;
  type: string;
  phone: string;
  address: string;
  logoUri: string | null;
}

interface BusinessState extends BusinessData {
  isSetupComplete: boolean;
  // Which signed-in account's data currently occupies this device's local database.
  // SQLite is fully device-local (no per-account scoping), so authStore checks this
  // before completing a sign-in: if it's set and doesn't match the newly signed-in
  // account, the device holds a *different* account's business data and must be wiped
  // before that data becomes visible to the new user. Null means either no account has
  // been recorded yet (fresh install, or a pre-existing install upgrading to this
  // tracking) or the data was just cleared (see clearBusiness).
  ownerUserId: string | null;
  setBusiness: (data: BusinessData) => void;
  updateLogo: (uri: string) => void;
  clearBusiness: () => void;
  setOwnerUserId: (id: string | null) => void;
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      name: '',
      type: '',
      phone: '',
      address: '',
      logoUri: null,
      isSetupComplete: false,
      ownerUserId: null,

      setBusiness: (data) =>
        set({ ...data, isSetupComplete: true }),

      updateLogo: (uri) => set({ logoUri: uri }),

      clearBusiness: () =>
        set({
          name: '',
          type: '',
          phone: '',
          address: '',
          logoUri: null,
          isSetupComplete: false,
          ownerUserId: null,
        }),

      setOwnerUserId: (id) => set({ ownerUserId: id }),
    }),
    {
      name: '@froshiar_business',
      storage: createJSONStorage(() => migratedAsyncStorage),
    }
  )
);
