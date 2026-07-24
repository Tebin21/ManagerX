import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { migratedAsyncStorage } from '@/lib/migratedStorage';
import {
  isFirebaseAvailable,
  getFirebaseAuth,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
} from '@/lib/firebase';

const WEB_CLIENT_ID =
  '1097351210121-glmjp9ul4vfa45hhsvemnmmpajff8eh6.apps.googleusercontent.com';

// Lazily imported — @react-native-google-signin/google-signin's package entry point
// also re-exports GoogleSigninButton, which calls TurboModuleRegistry.getEnforcing()
// (a *throwing* native-module lookup) at module-evaluation time, not inside a function.
// A static top-level import here would crash the whole app at launch (this file is
// imported from app/_layout.tsx) on any build where the native module isn't linked.
// This app's actual Google Sign-In button (components/auth/GoogleSignInButton.tsx) is
// fully custom and never uses the package's GoogleSigninButton, so deferring the import
// to first use — same pattern already used for expo-image-picker/expo-document-picker
// elsewhere in this codebase — costs nothing and confines any crash to the sign-in
// action itself instead of app startup.
let googleSigninConfigured = false;
async function getGoogleSignin() {
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
  if (!googleSigninConfigured) {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
    googleSigninConfigured = true;
  }
  return GoogleSignin;
}

export interface AppUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;

  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

function firebaseUserToAppUser(u: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}): AppUser {
  return {
    id: u.uid,
    email: u.email ?? null,
    displayName: u.displayName ?? null,
    photoURL: u.photoURL ?? null,
  };
}

// `user` is persisted to AsyncStorage so a returning user's session is
// restored instantly from disk on cold start, independent of how long the
// native Firebase SDK takes to report its own restored session. Firebase's
// onAuthStateChanged listener (see initialize()) keeps this cache fresh in
// the background and is the source of truth for whether a session is still
// actually valid — but routing no longer has to wait for it to fire before
// deciding where to send a returning, already-persisted user.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,

      signInWithGoogle: async () => {
        if (!isFirebaseAvailable) {
          return { error: 'Google Sign-In requires the iOS/Android app — not available on web.' };
        }
        set({ isLoading: true });
        try {
          const GoogleSignin = await getGoogleSignin();
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

          const signInResult = await GoogleSignin.signIn();

          // Support both v13+ ({ type, data }) and v10 (direct object) APIs
          if ((signInResult as any)?.type && (signInResult as any).type !== 'success') {
            set({ isLoading: false });
            return { error: 'Sign-in was cancelled.' };
          }
          const idToken =
            (signInResult as any)?.data?.idToken ?? (signInResult as any)?.idToken;
          if (!idToken) {
            set({ isLoading: false });
            return { error: 'Google Sign-In failed: no ID token received.' };
          }

          const credential = GoogleAuthProvider.credential(idToken);
          const { user } = await signInWithCredential(getFirebaseAuth(), credential);

          // This device's local business data (SQLite) isn't scoped per account. If it
          // already belongs to a *different* account than the one signing in now, wipe
          // it first so the newly signed-in user never sees the previous account's
          // products/customers/sales/financial records. A null ownerUserId means either
          // a fresh install or an existing install upgrading to this tracking — leave
          // that data alone rather than wiping on an unrelated app update.
          const { useBusinessStore } = await import('@/store/businessStore');
          const business = useBusinessStore.getState();
          if (business.isSetupComplete && business.ownerUserId && business.ownerUserId !== user.uid) {
            const { wipeAllBusinessData } = await import('@/lib/sqlite');
            await wipeAllBusinessData();
            business.clearBusiness();
          }
          useBusinessStore.getState().setOwnerUserId(user.uid);

          set({ user: firebaseUserToAppUser(user), isLoading: false });
          return { error: null };
        } catch (e: any) {
          set({ isLoading: false });
          return { error: e?.message ?? 'Google Sign-In failed.' };
        }
      },

      signOut: async () => {
        if (isFirebaseAvailable) {
          try { await firebaseSignOut(getFirebaseAuth()); } catch {}
          try {
            const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
            await GoogleSignin.signOut();
          } catch {}
        }
        set({ user: null });
      },

      // Stays subscribed for the lifetime of the app so an expired/revoked
      // session (user becomes null) is reflected immediately and the
      // (app) layout guard can redirect back to the Login screen. A failure
      // to reach Firebase here (e.g. a transient native-bridge hiccup) must
      // not wipe the locally persisted user — only an explicit signOut() or
      // a definitive "no user" report from Firebase should do that.
      initialize: () =>
        new Promise<void>((resolve) => {
          if (!isFirebaseAvailable) {
            set({ isLoading: false });
            resolve();
            return;
          }
          try {
            const authInstance = getFirebaseAuth();
            let resolved = false;
            onAuthStateChanged(authInstance, (firebaseUser) => {
              set({
                user: firebaseUser ? firebaseUserToAppUser(firebaseUser) : null,
                isLoading: false,
              });
              if (!resolved) {
                resolved = true;
                resolve();
              }
            });
          } catch (e) {
            console.error('[Froshiar] Firebase Auth unavailable:', e);
            set({ isLoading: false });
            resolve();
          }
        }),
    }),
    {
      name: '@froshiar_auth',
      storage: createJSONStorage(() => migratedAsyncStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
);
