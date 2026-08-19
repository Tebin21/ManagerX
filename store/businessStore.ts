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
  // True while a cold-start cloud reconciliation (store/authStore.ts's
  // reconcileColdStart) is in flight for a persisted-but-unconfirmed session.
  // app/index.tsx holds on its loading screen instead of routing to the
  // "Create Business" setup screen while this is true, so a returning account
  // whose local business data hasn't landed yet never flashes the setup flow.
  // Deliberately excluded from persistence (see partialize below) — a killed
  // app must never resume "stuck" on the loading screen.
  isReconciling: boolean;
  reconcileError: string | null;
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
  // Hydrates business fields from a cloud restore/pull — distinct from
  // setBusiness (owned by the manual Setup screen's Save action) because it
  // must never touch logoUri, which is this-device-local and not portable
  // across devices (see lib/cloudSync/collections.ts's image_uri stripping;
  // images have no cloud counterpart at all this phase).
  hydrateFromCloud: (data: { name: string; type: string; phone: string; address: string }) => void;
  updateLogo: (uri: string) => void;
  clearBusiness: () => void;
  setOwnerUserId: (id: string | null) => void;
  setPendingCloudConflict: (uid: string | null) => void;
  setReconciling: (value: boolean) => void;
  setReconcileError: (error: string | null) => void;
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
      isReconciling: false,
      reconcileError: null,

      setBusiness: (data) =>
        set({ ...data, isSetupComplete: true }),

      hydrateFromCloud: (data) =>
        set({
          name: data.name,
          type: data.type,
          phone: data.phone,
          address: data.address,
          isSetupComplete: true,
        }),

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
      setReconciling: (value) => set({ isReconciling: value }),
      setReconcileError: (error) => set({ reconcileError: error }),
    }),
    {
      name: '@froshiar_business',
      storage: createJSONStorage(() => migratedAsyncStorage),
      // pendingCloudConflict, isReconciling and reconcileError are all transient
      // in-flight state, not durable — never persist them (a killed app mid-decision
      // or mid-reconciliation must not resume stuck on the conflict/loading screen
      // forever with no way to re-trigger the sign-in that set it).
      partialize: (state) => {
        const { pendingCloudConflict: _pendingCloudConflict, isReconciling: _isReconciling, reconcileError: _reconcileError, ...rest } = state;
        return rest;
      },
    }
  )
);
