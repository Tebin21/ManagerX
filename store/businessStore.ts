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
  // Set by authStore's adoptSignedInUser when a newly signed-in Firebase uid
  // differs from ownerUserId AND both this device's local SQLite data and that
  // account's Firestore cloud data are non-empty — the one case cloud sync can't
  // safely auto-resolve (see app/(onboarding)/cloud-data-conflict.tsx). Routing
  // (app/index.tsx, app/(app)/_layout.tsx, app/(onboarding)/_layout.tsx) must
  // treat a non-null value here as blocking entry to the app shell, same as a
  // missing `user`, until the user picks merge/keep-local/keep-cloud.
  pendingCloudConflict: string | null;
  setBusiness: (data: BusinessData) => void;
  updateLogo: (uri: string) => void;
  clearBusiness: () => void;
  setOwnerUserId: (id: string | null) => void;
  setPendingCloudConflict: (uid: string | null) => void;
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
      pendingCloudConflict: null,

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
      setPendingCloudConflict: (uid) => set({ pendingCloudConflict: uid }),
    }),
    {
      name: '@froshiar_business',
      storage: createJSONStorage(() => migratedAsyncStorage),
      // pendingCloudConflict is a transient in-flight decision, not durable state —
      // never persist it (a killed app mid-decision must not resume stuck on the
      // conflict screen forever with no way to re-trigger the sign-in that set it).
      partialize: (state) => {
        const { pendingCloudConflict: _pendingCloudConflict, ...rest } = state;
        return rest;
      },
    }
  )
);
