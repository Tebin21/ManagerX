import { Platform } from 'react-native';
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
  AppleAuthProvider,
} from '@/lib/firebase';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

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
  // Transient — never persisted (see partialize below). Set while the Delete
  // Account flow (lib/accountDeletion.ts) is running so (app)/_layout.tsx's
  // auth guard doesn't redirect to Login the instant Firebase's deleteUser()
  // flips `user` to null, before the rest of the local cleanup has finished.
  isDeletingAccount: boolean;

  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithApple: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  deleteFirebaseAccount: () => Promise<{ error: string | null }>;
  setDeletingAccount: (value: boolean) => void;
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

// This device's local business data (SQLite) isn't scoped per account. If it already
// belongs to a *different* account than the one signing in now, wipe it first so the
// newly signed-in user never sees the previous account's products/customers/sales/
// financial records. A null ownerUserId means either a fresh install or an existing
// install upgrading to this tracking — leave that data alone rather than wiping on an
// unrelated app update. Shared by every sign-in provider (Google, Apple, ...).
async function adoptSignedInUser(
  user: FirebaseAuthTypes.User,
  set: (state: Partial<AuthState>) => void
) {
  const { useBusinessStore } = await import('@/store/businessStore');
  const business = useBusinessStore.getState();
  if (business.isSetupComplete && business.ownerUserId && business.ownerUserId !== user.uid) {
    const { wipeAllBusinessData } = await import('@/lib/sqlite');
    await wipeAllBusinessData();
    business.clearBusiness();
  }
  useBusinessStore.getState().setOwnerUserId(user.uid);

  set({ user: firebaseUserToAppUser(user), isLoading: false });
}

// Re-acquires a fresh credential for the currently signed-in user so
// deleteFirebaseAccount() can call reauthenticateWithCredential() after Firebase
// rejects a stale-session delete with 'auth/requires-recent-login'. Google can do
// this silently via a fresh GoogleSignin.signIn(); Apple has no silent path and
// must re-prompt interactively (same nonce dance as signInWithApple below).
// Returns null (never throws) on any failure/cancellation — the caller treats
// that as "user must sign out and back in manually".
async function reacquireCredential(
  user: FirebaseAuthTypes.User
): Promise<FirebaseAuthTypes.AuthCredential | null> {
  const providerId = user.providerData[0]?.providerId;

  if (providerId === 'google.com') {
    try {
      const GoogleSignin = await getGoogleSignin();
      const signInResult = await GoogleSignin.signIn();
      if ((signInResult as any)?.type && (signInResult as any).type !== 'success') return null;
      const idToken = (signInResult as any)?.data?.idToken ?? (signInResult as any)?.idToken;
      if (!idToken) return null;
      return GoogleAuthProvider.credential(idToken);
    } catch {
      return null;
    }
  }

  if (providerId === 'apple.com') {
    if (Platform.OS !== 'ios') return null;
    try {
      const AppleAuthentication = await import('expo-apple-authentication');
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) return null;

      const Crypto = await import('expo-crypto');
      const rawNonce = Array.from(await Crypto.getRandomBytesAsync(16))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashedNonce,
      });
      if (!appleCredential.identityToken) return null;
      return AppleAuthProvider.credential(appleCredential.identityToken, rawNonce);
    } catch {
      return null;
    }
  }

  return null;
}

function mapFirebaseDeleteError(e: any): string {
  switch (e?.code) {
    case 'auth/network-request-failed':
      return 'No internet connection. Please check your connection and try again.';
    case 'auth/requires-recent-login':
    case 'auth/user-mismatch':
    case 'auth/user-not-found':
      return 'Please sign out and sign back in, then try deleting your account again.';
    default:
      return 'Failed to delete your account. Please try again.';
  }
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
      isDeletingAccount: false,

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

          await adoptSignedInUser(user, set);
          return { error: null };
        } catch (e: any) {
          set({ isLoading: false });
          return { error: e?.message ?? 'Google Sign-In failed.' };
        }
      },

      signInWithApple: async () => {
        if (Platform.OS !== 'ios') {
          return { error: 'Sign in with Apple is only available on iOS.' };
        }
        if (!isFirebaseAvailable) {
          return { error: 'Apple Sign-In requires the iOS app — not available on web.' };
        }
        set({ isLoading: true });
        try {
          const AppleAuthentication = await import('expo-apple-authentication');
          const isAvailable = await AppleAuthentication.isAvailableAsync();
          if (!isAvailable) {
            set({ isLoading: false });
            return { error: 'Sign in with Apple is not available on this device.' };
          }

          // Apple's sign-in sheet must receive a SHA-256-hashed nonce; Firebase's
          // OAuthCredential verifies the identity token against the original raw value.
          const Crypto = await import('expo-crypto');
          const rawNonce = Array.from(await Crypto.getRandomBytesAsync(16))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
          const hashedNonce = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            rawNonce
          );

          const appleCredential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            nonce: hashedNonce,
          });

          if (!appleCredential.identityToken) {
            set({ isLoading: false });
            return { error: 'Apple Sign-In failed: no identity token received.' };
          }

          const credential = AppleAuthProvider.credential(appleCredential.identityToken, rawNonce);
          const { user } = await signInWithCredential(getFirebaseAuth(), credential);

          // Firebase only receives fullName/email from Apple on the account's very first
          // sign-in; the native credential's own copies are similarly first-sign-in-only,
          // so fall back to them here to populate the Firebase profile once.
          if (!user.displayName && appleCredential.fullName) {
            const name = [appleCredential.fullName.givenName, appleCredential.fullName.familyName]
              .filter(Boolean)
              .join(' ')
              .trim();
            if (name) {
              try { await user.updateProfile({ displayName: name }); } catch {}
            }
          }

          await adoptSignedInUser(user, set);
          return { error: null };
        } catch (e: any) {
          set({ isLoading: false });
          if (e?.code === 'ERR_REQUEST_CANCELED') {
            return { error: null };
          }
          return { error: e?.message ?? 'Apple Sign-In failed.' };
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

      deleteFirebaseAccount: async () => {
        if (!isFirebaseAvailable) return { error: null };
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user) return { error: null };

        const { deleteUser, reauthenticateWithCredential } = await import('@react-native-firebase/auth');
        try {
          await deleteUser(user);
          return { error: null };
        } catch (e: any) {
          if (e?.code !== 'auth/requires-recent-login') {
            return { error: mapFirebaseDeleteError(e) };
          }
          try {
            const credential = await reacquireCredential(user);
            if (!credential) {
              return { error: 'Please sign out and sign back in, then try deleting your account again.' };
            }
            await reauthenticateWithCredential(user, credential);
            await deleteUser(user);
            return { error: null };
          } catch (reauthErr: any) {
            return { error: mapFirebaseDeleteError(reauthErr) };
          }
        }
      },

      setDeletingAccount: (value: boolean) => set({ isDeletingAccount: value }),

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
