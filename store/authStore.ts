import { create } from 'zustand';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
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

let googleSigninConfigured = false;
function ensureGoogleSigninConfigured() {
  if (googleSigninConfigured) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  googleSigninConfigured = true;
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  signInWithGoogle: async () => {
    if (!isFirebaseAvailable) {
      return { error: 'Google Sign-In requires the iOS/Android app — not available on web.' };
    }
    set({ isLoading: true });
    try {
      ensureGoogleSigninConfigured();
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
      try { await GoogleSignin.signOut(); } catch {}
    }
    set({ user: null });
  },

  // Stays subscribed for the lifetime of the app so an expired/revoked
  // session (user becomes null) is reflected immediately and the
  // (app) layout guard can redirect back to the Login screen.
  initialize: () =>
    new Promise<void>((resolve) => {
      if (!isFirebaseAvailable) {
        set({ user: null, isLoading: false });
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
        console.error('[ManagerX] Firebase Auth unavailable:', e);
        set({ user: null, isLoading: false });
        resolve();
      }
    }),
}));
