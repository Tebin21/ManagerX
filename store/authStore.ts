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
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from '@/lib/firebase';
import type { User, AuthCredential } from '@react-native-firebase/auth';
import i18n from '@/lib/i18n';

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
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
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

// This device's local business data (SQLite) isn't scoped per account. Historically
// this function unconditionally wiped it the instant a different account's uid
// signed in — simple, but capable of silently destroying real local data the moment
// a second account (or a second device on the same account) actually needs to
// coexist with cloud sync. Replaced with a real decision tree once Firestore became
// the source of truth for "does this account already have data somewhere":
//
//   same owner already            -> nothing to decide, just (re)start sync
//   no local data                 -> pull cloud data if any exists (nothing local to lose)
//   local data, cloud empty       -> this device's data seeds the account (push, no wipe)
//   local data AND cloud data     -> can't auto-resolve safely; route to a blocking
//                                     conflict screen (app/(onboarding)/cloud-data-conflict.tsx)
//                                     instead of guessing which side should win
//
// Shared by every sign-in provider (Google, Apple, email/password) AND by
// initialize()'s onAuthStateChanged listener on every cold start with an
// already-persisted session — which means an explicit signIn* call and the
// listener's own follow-up firing shortly after can both invoke this for the
// same uid nearly simultaneously. adoptingPromise collapses concurrent calls
// into one in-flight decision so two racing calls can't both independently
// decide to e.g. bulk-restore or push a full snapshot for the same account.
let adoptingUid: string | null = null;
let adoptingPromise: Promise<void> | null = null;

// DIAGNOSTIC ONLY (cold-start SIGSEGV isolation, see .claude/plans) — see
// initialize() below. Set back to false to restore normal startup behavior.
const DIAGNOSTIC_SKIP_AUTH_STATE_LISTENER = true;

async function adoptSignedInUser(
  user: User,
  set: (state: Partial<AuthState>) => void,
  auto: boolean = false
) {
  if (adoptingUid === user.uid && adoptingPromise) {
    set({ user: firebaseUserToAppUser(user), isLoading: false });
    return adoptingPromise;
  }
  adoptingUid = user.uid;
  adoptingPromise = adoptSignedInUserInner(user, set, auto).finally(() => {
    adoptingUid = null;
    adoptingPromise = null;
  });
  return adoptingPromise;
}

// True while `uid` is still the store's signed-in user. Used after every await
// point in adoptSignedInUserInner below — a concurrent signOut() (e.g. the user
// double-tapping sign-in then sign-out, or switching accounts) must not let a
// stale continuation re-establish cloud sync, set ownerUserId, or flag a cloud
// conflict for an account that's no longer (or not yet) actually signed in.
function isCurrentAuthUser(uid: string): boolean {
  return useAuthStore.getState().user?.id === uid;
}

async function adoptSignedInUserInner(
  user: User,
  set: (state: Partial<AuthState>) => void,
  auto: boolean = false
) {
  const { initializeDatabase } = await import('@/lib/sqlite');
  await initializeDatabase();

  const { useBusinessStore } = await import('@/store/businessStore');
  const business = useBusinessStore.getState();

  // Let navigation proceed immediately — the (app)/index.tsx and (app)/_layout.tsx
  // guards route on `pendingCloudConflict`, not on this function having fully
  // resolved, so it's safe to set `user` before the async decision below finishes.
  set({ user: firebaseUserToAppUser(user), isLoading: false });

  // Diagnostic isolation (see .claude/plans cold-start SIGSEGV report): a TestFlight
  // crash log shows a live Firestore gRPC thread and a TurboModule NSException-to-
  // JSError conversion crashing the Hermes JS thread during cold start, even with
  // cloud-sync's own AUTO_START_ENABLED flag off — because that flag only gates
  // startCloudSync() below, not the cloudBusinessDataExists() Firestore read (or the
  // ownerUserId branch's startCloudSync call) that runs before it on every cold start
  // for an already-signed-in device. While isolating, a resumed session (auto=true)
  // skips this entire block and leaves the user signed in locally only — all cloud
  // work becomes reachable only from an explicit sign-in/sign-up or the manual
  // Settings > Cloud Sync screen. Remove once the crash is confirmed/fixed.
  if (auto) return;

  if (business.ownerUserId === user.uid) {
    const { startCloudSync } = await import('@/lib/cloudSync');
    if (!isCurrentAuthUser(user.uid)) return;
    startCloudSync(user.uid, { auto });
    return;
  }

  if (!isFirebaseAvailable) {
    // Web/no-Firestore build — fall back to the old wipe-on-switch behavior rather
    // than getting stuck: there's no cloud to detect or restore from at all here.
    if (business.isSetupComplete && business.ownerUserId) {
      const { wipeAllBusinessData } = await import('@/lib/sqlite');
      await wipeAllBusinessData();
      business.clearBusiness();
    }
    if (!isCurrentAuthUser(user.uid)) return;
    useBusinessStore.getState().setOwnerUserId(user.uid);
    return;
  }

  const { localBusinessDataExists } = await import('@/lib/sqlite');
  const { cloudBusinessDataExists, pushFullLocalSnapshot, restoreFromCloudBulk, startCloudSync } = await import('@/lib/cloudSync');

  const [localHasData, cloudHasData] = await Promise.all([
    localBusinessDataExists(),
    cloudBusinessDataExists(user.uid),
  ]);

  if (!isCurrentAuthUser(user.uid)) return;

  if (!localHasData) {
    if (cloudHasData) {
      try { await restoreFromCloudBulk(user.uid); } catch (e) { console.error('[Froshiar] Cloud restore failed:', e); }
    }
    if (!isCurrentAuthUser(user.uid)) return;
    useBusinessStore.getState().setOwnerUserId(user.uid);
    startCloudSync(user.uid, { auto });
    return;
  }

  if (!cloudHasData) {
    useBusinessStore.getState().setOwnerUserId(user.uid);
    try { await pushFullLocalSnapshot(user.uid); } catch (e) { console.error('[Froshiar] Initial cloud push failed:', e); }
    if (!isCurrentAuthUser(user.uid)) return;
    startCloudSync(user.uid, { auto });
    return;
  }

  // Both sides have data — can't safely auto-merge. Block entry until the user
  // picks merge / keep-local / keep-cloud on the conflict screen; ownerUserId is
  // deliberately NOT set yet, so a killed app before the user decides re-enters
  // this same branch on next launch instead of silently picking a side.
  useBusinessStore.getState().setPendingCloudConflict(user.uid);
}

// Re-acquires a fresh credential for the currently signed-in user so
// deleteFirebaseAccount() can call reauthenticateWithCredential() after Firebase
// rejects a stale-session delete with 'auth/requires-recent-login'. Google can do
// this silently via a fresh GoogleSignin.signIn(); Apple has no silent path and
// must re-prompt interactively (same nonce dance as signInWithApple below).
// Returns null (never throws) on any failure/cancellation — the caller treats
// that as "user must sign out and back in manually".
async function reacquireCredential(
  user: User
): Promise<AuthCredential | null> {
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

// Maps Firebase Auth's error codes to localized, user-friendly messages for the
// email/password sign-up/sign-in/reset flows — deliberately routed through i18n
// (unlike mapFirebaseDeleteError above, which predates the project's "all
// user-facing strings must be localized" rule and still returns raw English).
function mapFirebaseAuthError(e: any): string {
  switch (e?.code) {
    case 'auth/email-already-in-use':
      return i18n.t('authErrors.emailAlreadyInUse');
    case 'auth/weak-password':
      return i18n.t('authErrors.weakPassword');
    case 'auth/invalid-email':
      return i18n.t('authErrors.invalidEmail');
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return i18n.t('authErrors.wrongPassword');
    case 'auth/user-not-found':
      return i18n.t('authErrors.userNotFound');
    case 'auth/network-request-failed':
      return i18n.t('authErrors.networkError');
    case 'auth/too-many-requests':
      return i18n.t('authErrors.tooManyRequests');
    // Signing up with an email that's already registered under Google/Apple
    // hits this — account linking (linkWithCredential) is an explicit non-goal
    // for this release, so just point the user at the method they already used.
    case 'auth/account-exists-with-different-credential':
      return i18n.t('authErrors.emailAlreadyInUseDifferentMethod');
    default:
      return i18n.t('authErrors.generic');
  }
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
          // Only Firebase's own `auth/*` codes go through the localized mapper —
          // e.g. signing in with Google using an email already registered via
          // password hits `auth/account-exists-with-different-credential`, which
          // has a dedicated friendly message below. Native Google Sign-In SDK
          // errors (cancellation, missing Play Services, etc.) aren't Firebase
          // codes and keep their own message instead of a generic fallback.
          if (typeof e?.code === 'string' && e.code.startsWith('auth/')) {
            return { error: mapFirebaseAuthError(e) };
          }
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
              try { await updateProfile(user, { displayName: name }); } catch {}
            }
          }

          await adoptSignedInUser(user, set);
          return { error: null };
        } catch (e: any) {
          set({ isLoading: false });
          if (e?.code === 'ERR_REQUEST_CANCELED') {
            return { error: null };
          }
          // See signInWithGoogle's catch for why only auth/* codes are mapped.
          if (typeof e?.code === 'string' && e.code.startsWith('auth/')) {
            return { error: mapFirebaseAuthError(e) };
          }
          return { error: e?.message ?? 'Apple Sign-In failed.' };
        }
      },

      signUpWithEmail: async (email, password, displayName) => {
        if (!isFirebaseAvailable) {
          return { error: 'Account creation requires the iOS/Android app — not available on web.' };
        }
        set({ isLoading: true });
        try {
          const { user } = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
          if (displayName?.trim()) {
            try { await updateProfile(user, { displayName: displayName.trim() }); } catch {}
          }
          await adoptSignedInUser(user, set);
          return { error: null };
        } catch (e: any) {
          set({ isLoading: false });
          return { error: mapFirebaseAuthError(e) };
        }
      },

      signInWithEmail: async (email, password) => {
        if (!isFirebaseAvailable) {
          return { error: 'Login requires the iOS/Android app — not available on web.' };
        }
        set({ isLoading: true });
        try {
          const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
          await adoptSignedInUser(user, set);
          return { error: null };
        } catch (e: any) {
          set({ isLoading: false });
          return { error: mapFirebaseAuthError(e) };
        }
      },

      resetPassword: async (email) => {
        if (!isFirebaseAvailable) {
          return { error: 'Password reset requires the iOS/Android app — not available on web.' };
        }
        try {
          await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
          return { error: null };
        } catch (e: any) {
          return { error: mapFirebaseAuthError(e) };
        }
      },

      signOut: async () => {
        try {
          const { stopCloudSync } = await import('@/lib/cloudSync');
          stopCloudSync();
        } catch {}
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
        // Wrapped in an outer try/catch (unlike every other Firebase call in this
        // store, getFirebaseAuth() here previously wasn't guarded) — an uncaught
        // throw from this method becomes an unhandled rejection in the Settings
        // "Delete Account" flow, which has no catch of its own and permanently
        // soft-locks the UI in its "deleting" state.
        try {
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
        } catch (e: any) {
          return { error: e?.message ?? 'Failed to delete account. Please try again.' };
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
            // DIAGNOSTIC ONLY (cold-start SIGSEGV isolation, see .claude/plans) —
            // flip to false to restore the startup onAuthStateChanged listener.
            // Firebase Auth still initializes above via getFirebaseAuth(); only
            // listener *registration* is skipped, so a persisted session can no
            // longer auto-trigger adoptSignedInUser during cold start. Explicit
            // signIn*/signUp* paths call adoptSignedInUser() directly and are
            // unaffected. Remove this block once the crash is confirmed/ruled out.
            if (DIAGNOSTIC_SKIP_AUTH_STATE_LISTENER) {
              set({ isLoading: false });
              resolve();
              return;
            }
            let resolved = false;
            onAuthStateChanged(authInstance, (firebaseUser) => {
              if (firebaseUser) {
                // Runs the same decision tree as an explicit sign-in (adoptingPromise
                // collapses this against any concurrent explicit signIn*/signUp* call
                // for the same uid) — required so a resumed session on a device that
                // was killed mid-decision (see the module doc above) re-detects an
                // unresolved local-vs-cloud conflict instead of silently skipping it.
                adoptSignedInUser(firebaseUser, set, true).catch((e) =>
                  console.error('[Froshiar] adoptSignedInUser (resumed session) failed:', e)
                );
              } else {
                set({ user: null, isLoading: false });
              }
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
