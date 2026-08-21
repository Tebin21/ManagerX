import { Platform, InteractionManager } from 'react-native';
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
  reload,
  updateProfile,
  getIdToken,
} from '@/lib/firebase';
import type { User, AuthCredential } from '@react-native-firebase/auth';
import i18n from '@/lib/i18n';

const WEB_CLIENT_ID =
  '1097351210121-glmjp9ul4vfa45hhsvemnmmpajff8eh6.apps.googleusercontent.com';

// TEST/APP-REVIEW ONLY — do not remove without also removing the check below.
// A single, dedicated Firebase Authentication account (a real account, created
// the same way any user's is — see fix.md) used exclusively by Apple App
// Review/TestFlight testers, who have no inbox to receive a verification
// link. Exempts *only* this exact email from the email-verification gate in
// signInWithEmail below; every other account — including every other
// email/password sign-up — goes through verification exactly as before.
const APP_REVIEW_DEMO_EMAIL = 'demo@froshiar.store';

// Base URL of the standalone auth-server/ backend (see that folder's README) that
// generates/verifies the 6-digit email OTP. Never falls back to a hardcoded prod
// URL — an unset var should fail loudly (every OTP call rejects) rather than
// silently point at nothing.
const AUTH_SERVER_URL = process.env.EXPO_PUBLIC_AUTH_SERVER_URL ?? '';

type OtpErrorCode =
  | 'network'
  | 'cooldown'
  | 'rate_limited'
  | 'email_send_failed'
  | 'no_pending_otp'
  | 'expired'
  | 'invalid_code'
  | 'too_many_attempts'
  | 'server_error'
  | 'not_configured';

class OtpRequestError extends Error {
  code: OtpErrorCode;
  constructor(code: OtpErrorCode) {
    super(code);
    this.code = code;
  }
}

// Thin fetch wrapper for auth-server/'s /api/otp/* endpoints. Every call carries
// the caller's own fresh Firebase ID token — the backend derives uid/email from
// that token itself, so a client can never claim to be a different account.
async function callAuthServer(
  path: string,
  opts: { idToken: string; body?: Record<string, unknown> }
): Promise<Record<string, any>> {
  if (!AUTH_SERVER_URL) throw new OtpRequestError('not_configured');

  let res: Response;
  try {
    res = await fetch(`${AUTH_SERVER_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.idToken}`,
      },
      body: JSON.stringify(opts.body ?? {}),
    });
  } catch {
    throw new OtpRequestError('network');
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // fall through — json stays null, handled below
  }

  if (!res.ok) {
    const code: OtpErrorCode =
      typeof json?.error === 'string' && json.error.length > 0 ? json.error : 'server_error';
    throw new OtpRequestError(code);
  }
  return json ?? {};
}

// Maps auth-server's OTP error codes to localized, user-friendly messages —
// mirrors mapFirebaseAuthError below. Never surfaces the raw backend code/text.
function mapOtpError(e: any): string {
  const code: OtpErrorCode = e instanceof OtpRequestError ? e.code : 'server_error';
  switch (code) {
    case 'network':
      return i18n.t('authErrors.networkError');
    case 'cooldown':
      return i18n.t('verifyEmail.resendCooldownError');
    case 'rate_limited':
      return i18n.t('verifyEmail.resendRateLimited');
    case 'email_send_failed':
    case 'not_configured':
      return i18n.t('verifyEmail.sendFailedGeneric');
    case 'no_pending_otp':
      return i18n.t('verifyEmail.errorNoPendingCode');
    case 'expired':
      return i18n.t('verifyEmail.errorCodeExpired');
    case 'invalid_code':
      return i18n.t('verifyEmail.errorInvalidCode');
    case 'too_many_attempts':
      return i18n.t('verifyEmail.errorTooManyAttempts');
    default:
      return i18n.t('authErrors.generic');
  }
}

// Shared by signUpWithEmail's initial send and resendEmailOtp's "Resend Code" —
// both just need "ask auth-server to (re)issue a code for whoever this ID token
// belongs to." The backend enforces cooldown/rate-limit itself; this layer only
// reports success/failure back to the caller.
async function requestOtpForUser(
  user: User,
  diagnosticOp: 'sendEmailVerification' | 'sendEmailVerificationResend'
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const idToken = await getIdToken(user);
    await callAuthServer('/api/otp/request', { idToken });
    logAuthEmailDiagnostic(diagnosticOp, { success: true });
    return { ok: true, error: null };
  } catch (e: any) {
    logAuthEmailDiagnostic(diagnosticOp, { success: false, error: e });
    return { ok: false, error: mapOtpError(e) };
  }
}

// auth-server's password-reset flow (see auth-server/src/routes/passwordReset.ts)
// is entirely separate from the /api/otp/* flow above — a user who forgot their
// password isn't signed in and has no Firebase ID token, so these error codes and
// this fetch wrapper deliberately don't share anything with OtpErrorCode/
// callAuthServer beyond the same shape.
type PasswordResetErrorCode =
  | 'network'
  | 'not_configured'
  | 'invalid_email'
  | 'cooldown'
  | 'rate_limited'
  | 'email_send_failed'
  | 'no_pending_otp'
  | 'expired'
  | 'invalid_code'
  | 'too_many_attempts'
  | 'invalid_or_expired_token'
  | 'weak_password'
  | 'server_error';

class PasswordResetRequestError extends Error {
  code: PasswordResetErrorCode;
  constructor(code: PasswordResetErrorCode) {
    super(code);
    this.code = code;
  }
}

// Unauthenticated counterpart to callAuthServer above — no Bearer token, since the
// caller isn't signed in during this flow. The backend derives everything from the
// email (and, for /complete, the server-issued reset token) in the body instead.
async function callPasswordResetServer(path: string, body: Record<string, unknown>): Promise<Record<string, any>> {
  if (!AUTH_SERVER_URL) throw new PasswordResetRequestError('not_configured');

  let res: Response;
  try {
    res = await fetch(`${AUTH_SERVER_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new PasswordResetRequestError('network');
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // fall through — json stays null, handled below
  }

  if (!res.ok) {
    const code: PasswordResetErrorCode =
      typeof json?.error === 'string' && json.error.length > 0 ? json.error : 'server_error';
    throw new PasswordResetRequestError(code);
  }
  return json ?? {};
}

// Maps auth-server's password-reset error codes to localized, user-friendly
// messages — mirrors mapOtpError above. Never surfaces the raw backend code/text.
function mapPasswordResetError(e: any): string {
  const code: PasswordResetErrorCode = e instanceof PasswordResetRequestError ? e.code : 'server_error';
  switch (code) {
    case 'network':
      return i18n.t('authErrors.networkError');
    case 'cooldown':
      return i18n.t('verifyResetOtp.resendCooldownError');
    case 'rate_limited':
      return i18n.t('verifyResetOtp.resendRateLimited');
    case 'email_send_failed':
    case 'not_configured':
      return i18n.t('verifyResetOtp.sendFailedGeneric');
    case 'no_pending_otp':
      return i18n.t('verifyResetOtp.errorNoPendingCode');
    case 'expired':
      return i18n.t('verifyResetOtp.errorCodeExpired');
    case 'invalid_code':
      return i18n.t('verifyResetOtp.errorInvalidCode');
    case 'too_many_attempts':
      return i18n.t('verifyResetOtp.errorTooManyAttempts');
    case 'invalid_or_expired_token':
      return i18n.t('newPassword.errorInvalidOrExpiredToken');
    case 'weak_password':
      return i18n.t('signup.validation.passwordTooShort');
    case 'invalid_email':
      return i18n.t('signup.validation.emailInvalid');
    default:
      return i18n.t('authErrors.generic');
  }
}

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
  // Set while a just-created or just-logged-in account has not yet verified
  // its email — adoptSignedInUser() (cloud sync) is deliberately NOT called
  // until this clears, so a persisted value here (see partialize below) is
  // what routes app/index.tsx to the Verify Email screen across relaunches.
  pendingVerificationEmail: string | null;
  // Transient — never persisted (see partialize below). Set while the new
  // OTP-based Forgot Password flow (app/(onboarding)/forgot-password.tsx ->
  // verify-reset-otp.tsx -> new-password.tsx) is in progress. Unlike
  // pendingVerificationEmail above, an app kill mid-flow just restarts at
  // Step 1 rather than resuming — the reset-authorization token is short-lived
  // anyway, so there's little value in surviving a relaunch.
  pendingPasswordResetEmail: string | null;
  // Single-use, server-issued token proving the OTP for pendingPasswordResetEmail
  // was already verified (see verifyPasswordResetOtp below). completePasswordReset
  // requires it — the client can never set a password just by claiming success.
  pendingPasswordResetToken: string | null;

  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithApple: () => Promise<{ error: string | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ error: string | null; verificationEmailSent: boolean }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null; needsVerification?: boolean }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  verifyEmailOtp: (code: string) => Promise<{ verified: boolean; error: string | null; locked?: boolean }>;
  resendEmailOtp: () => Promise<{ error: string | null }>;
  cancelPendingVerification: () => Promise<void>;
  requestPasswordResetOtp: (email: string) => Promise<{ error: string | null }>;
  resendPasswordResetOtp: () => Promise<{ error: string | null }>;
  verifyPasswordResetOtp: (code: string) => Promise<{ verified: boolean; error: string | null; locked?: boolean }>;
  completePasswordReset: (newPassword: string) => Promise<{ error: string | null }>;
  cancelPasswordReset: () => void;
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

// Exported for reconcileColdStart() below — the cold-start reconciliation entry
// point deliberately reuses this exact function (dedup/decision-tree included)
// rather than a parallel path, so the account-switch wipe guard and the
// pendingCloudConflict routing stay correct no matter which caller triggered it.
export async function adoptSignedInUser(
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
    if (!isFirebaseAvailable) {
      if (!isCurrentAuthUser(user.uid)) return;
      startCloudSync(user.uid, { auto });
      return;
    }

    // Same account as last time on this device — ordinarily there's nothing to
    // restore, since logout never wipes local data. But this flag alone was being
    // trusted with no re-check, so a device that ended up with empty local data
    // (e.g. a previous sync never completed and something else cleared storage)
    // had no path back to its cloud data. Mirror the fresh-device decision tree
    // below: only restore if local is actually empty and the cloud actually has
    // something, so a legitimate unsynced local copy is never overwritten.
    const { localBusinessDataExists } = await import('@/lib/sqlite');
    const { cloudBusinessDataExists, restoreFromCloudBulk } = await import('@/lib/cloudSync');
    const localHasData = await localBusinessDataExists();
    if (!isCurrentAuthUser(user.uid)) return;
    if (!localHasData) {
      const cloudHasData = await cloudBusinessDataExists(user.uid);
      if (!isCurrentAuthUser(user.uid)) return;
      if (cloudHasData) {
        try { await restoreFromCloudBulk(user.uid); } catch (e) { console.error('[Froshiar] Cloud restore failed:', e); }
        if (!isCurrentAuthUser(user.uid)) return;
      }
    }
    startCloudSync(user.uid, { auto });
    return;
  }

  // This device's local SQLite data is known (via ownerUserId) to belong to a
  // different account than the one now signing in. Never let a second account
  // inherit — or, via pushFullLocalSnapshot below, upload — a previous account's
  // business data: wipe it up front, before deciding how to seed the newly
  // signed-in account. A null ownerUserId (data predates this tracking, or a
  // genuinely fresh device) is NOT a mismatch — that ambiguous case still falls
  // through to the local/cloud-data-exists decision tree and conflict screen below.
  if (business.ownerUserId && business.ownerUserId !== user.uid) {
    const { wipeAllBusinessData } = await import('@/lib/sqlite');
    await wipeAllBusinessData();
    business.clearBusiness();
    try {
      const { clearStoreApiKey } = await import('@/lib/onlineStore/storage');
      await clearStoreApiKey();
    } catch {}
    if (!isCurrentAuthUser(user.uid)) return;
  }

  if (!isFirebaseAvailable) {
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

let coldStartReconcileRequested = false;

// Cold-start cloud reconciliation entry point — called once from app/index.tsx
// after auth/business store hydration, for a persisted session on a fresh app
// launch. Deliberately NOT wired through onAuthStateChanged/AUTO_START_ENABLED
// (both stay exactly as they were left during the now-fixed native crash
// isolation, see DIAGNOSTIC_SKIP_AUTH_STATE_LISTENER above and
// lib/cloudSync/index.ts) — this is a separate, explicit call that reuses the
// same adoptSignedInUser() decision tree with `auto` left at its default
// `false`, so the full restore/push/conflict logic actually runs (unlike the
// disabled listener's own auto=true calls, which early-exit immediately).
//
// Firestore work is deferred past the first interaction frame here — not just
// inside startCloudSync() below, since cloudBusinessDataExists()/
// restoreFromCloudBulk() run *before* startCloudSync() is ever reached inside
// adoptSignedInUserInner, so they are not covered by that function's own
// internal InteractionManager deferral. This preserves the "no burst of native
// Firestore calls on the very first tick of cold start" property the two
// isolation flags were protecting, without touching either of them.
export async function reconcileColdStart(): Promise<void> {
  if (!isFirebaseAvailable || coldStartReconcileRequested) return;
  coldStartReconcileRequested = true;

  const { useBusinessStore } = await import('@/store/businessStore');
  useBusinessStore.getState().setReconciling(true);

  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });

  try {
    const liveUser = getFirebaseAuth().currentUser;
    if (!liveUser) return;
    await adoptSignedInUser(liveUser, useAuthStore.setState, false);
  } catch (e) {
    useBusinessStore.getState().setReconcileError(e instanceof Error ? e.message : String(e));
    if (__DEV__) console.warn('[Froshiar] Cold-start cloud reconciliation failed:', e);
  } finally {
    useBusinessStore.getState().setReconciling(false);
  }
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

// Dev-only diagnostics for the email-delivery-adjacent Firebase Auth calls.
// Never logs password/token/credential values or the email address itself —
// only operation metadata — so these call sites are safe to leave in place
// permanently. No-ops entirely outside __DEV__.
function logAuthEmailDiagnostic(
  operation:
    | 'sendEmailVerification'
    | 'sendEmailVerificationResend'
    | 'sendPasswordResetEmail'
    | 'verifyEmailOtp',
  result: { success: boolean; error?: any }
) {
  if (!__DEV__) return;
  const user = getFirebaseAuth().currentUser;
  console.log('[authEmail]', {
    operation,
    success: result.success,
    code: result.error?.code ?? null,
    message: result.error?.message ?? null,
    hasCurrentUser: !!user,
    emailVerified: user?.emailVerified ?? null,
  });
}

// Maps Firebase Auth's error codes to localized, user-friendly messages for the
// email/password sign-up/sign-in/reset flows — deliberately routed through i18n.
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
      return i18n.t('authErrors.deleteNetworkError');
    case 'auth/requires-recent-login':
    case 'auth/user-mismatch':
    case 'auth/user-not-found':
      return i18n.t('authErrors.deleteRequiresRecentLogin');
    default:
      return i18n.t('authErrors.deleteGeneric');
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
    (set, get) => ({
      user: null,
      isLoading: false,
      isDeletingAccount: false,
      pendingVerificationEmail: null,
      pendingPasswordResetEmail: null,
      pendingPasswordResetToken: null,

      signInWithGoogle: async () => {
        if (!isFirebaseAvailable) {
          return { error: i18n.t('authErrors.googleUnavailableWeb') };
        }
        set({ isLoading: true });
        try {
          const GoogleSignin = await getGoogleSignin();
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

          const signInResult = await GoogleSignin.signIn();

          // Support both v13+ ({ type, data }) and v10 (direct object) APIs
          if ((signInResult as any)?.type && (signInResult as any).type !== 'success') {
            set({ isLoading: false });
            return { error: i18n.t('authErrors.googleSignInCancelled') };
          }
          const idToken =
            (signInResult as any)?.data?.idToken ?? (signInResult as any)?.idToken;
          if (!idToken) {
            set({ isLoading: false });
            return { error: i18n.t('authErrors.googleNoIdToken') };
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
          return { error: i18n.t('authErrors.appleIOSOnly') };
        }
        if (!isFirebaseAvailable) {
          return { error: i18n.t('authErrors.appleUnavailableWeb') };
        }
        set({ isLoading: true });
        try {
          const AppleAuthentication = await import('expo-apple-authentication');
          const isAvailable = await AppleAuthentication.isAvailableAsync();
          if (!isAvailable) {
            set({ isLoading: false });
            return { error: i18n.t('authErrors.appleUnavailableDevice') };
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
            return { error: i18n.t('authErrors.appleNoIdentityToken') };
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
          return {
            error: 'Account creation requires the iOS/Android app — not available on web.',
            verificationEmailSent: false,
          };
        }
        set({ isLoading: true });
        try {
          const { user } = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
          if (displayName?.trim()) {
            try { await updateProfile(user, { displayName: displayName.trim() }); } catch {}
          }
          // Account creation still succeeds either way — adoptSignedInUser() (cloud
          // sync) is withheld until verifyEmailOtp() confirms the address, so a
          // brand-new account never enters the app unverified regardless of
          // whether this initial OTP send worked. Whether it worked is reported
          // back to the caller (verificationEmailSent) so the UI can tell the
          // user the truth instead of always claiming a code was sent — see
          // verify-email.tsx.
          const { ok: verificationEmailSent } = await requestOtpForUser(user, 'sendEmailVerification');
          set({ isLoading: false, pendingVerificationEmail: user.email });
          return { error: null, verificationEmailSent };
        } catch (e: any) {
          set({ isLoading: false });
          return { error: mapFirebaseAuthError(e), verificationEmailSent: false };
        }
      },

      signInWithEmail: async (email, password) => {
        if (!isFirebaseAvailable) {
          return { error: 'Login requires the iOS/Android app — not available on web.' };
        }
        set({ isLoading: true });
        try {
          const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
          // See APP_REVIEW_DEMO_EMAIL above — the one exempted account skips
          // the verification gate; every other account is unaffected.
          const isAppReviewDemoAccount = user.email?.toLowerCase() === APP_REVIEW_DEMO_EMAIL;
          if (!user.emailVerified && !isAppReviewDemoAccount) {
            set({ isLoading: false, pendingVerificationEmail: user.email });
            return { error: null, needsVerification: true };
          }
          set({ pendingVerificationEmail: null });
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
          logAuthEmailDiagnostic('sendPasswordResetEmail', { success: true });
          return { error: null };
        } catch (e: any) {
          // Deliberately not surfaced as an error — telling the caller "no account
          // exists for this email" would let the reset form be used to enumerate
          // registered accounts. Every other error (invalid format, network,
          // rate-limit) still surfaces normally.
          logAuthEmailDiagnostic('sendPasswordResetEmail', { success: false, error: e });
          if (e?.code === 'auth/user-not-found') return { error: null };
          return { error: mapFirebaseAuthError(e) };
        }
      },

      // Verifies a 6-digit code against auth-server/'s /api/otp/verify (which
      // holds the authoritative, hashed code — never generated or checked
      // client-side). On success the backend has already called Firebase Admin's
      // updateUser(uid, { emailVerified: true }); reload() here just picks that
      // up on this client and, once verified, clears pendingVerificationEmail
      // and adopts the now-signed-in user.
      verifyEmailOtp: async (code) => {
        if (!isFirebaseAvailable) return { verified: false, error: null };
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user) return { verified: false, error: i18n.t('authErrors.generic') };
        try {
          const idToken = await getIdToken(user);
          await callAuthServer('/api/otp/verify', { idToken, body: { code } });
          await reload(user);
          const refreshed = auth.currentUser;
          logAuthEmailDiagnostic('verifyEmailOtp', { success: true });
          if (refreshed?.emailVerified) {
            set({ pendingVerificationEmail: null });
            await adoptSignedInUser(refreshed, set);
            return { verified: true, error: null };
          }
          // Backend confirmed success but this client's reload() hasn't reflected
          // it yet (rare token-cache lag) — let the user retry once rather than
          // showing a false error.
          return { verified: false, error: null };
        } catch (e: any) {
          logAuthEmailDiagnostic('verifyEmailOtp', { success: false, error: e });
          const locked = e instanceof OtpRequestError && e.code === 'too_many_attempts';
          return { verified: false, error: mapOtpError(e), locked };
        }
      },

      resendEmailOtp: async () => {
        if (!isFirebaseAvailable) return { error: null };
        const user = getFirebaseAuth().currentUser;
        if (!user) return { error: i18n.t('authErrors.generic') };
        const { error } = await requestOtpForUser(user, 'sendEmailVerificationResend');
        return { error };
      },

      cancelPendingVerification: async () => {
        set({ pendingVerificationEmail: null });
        // Safe to sign out here — adoptSignedInUser() was never called for this
        // session, so no cloud data, ownerUserId, or sync state was ever touched.
        if (isFirebaseAvailable) {
          try { await firebaseSignOut(getFirebaseAuth()); } catch {}
        }
      },

      // The OTP-based Forgot Password flow below is a separate, unauthenticated
      // path to auth-server/'s /api/password-reset/* endpoints — it never touches
      // the Firebase client SDK (no sign-in, no ID token), so unlike the actions
      // above it works the same regardless of isFirebaseAvailable/platform.
      requestPasswordResetOtp: async (email) => {
        const trimmed = email.trim();
        try {
          await callPasswordResetServer('/api/password-reset/request', { email: trimmed });
          set({ pendingPasswordResetEmail: trimmed, pendingPasswordResetToken: null });
          return { error: null };
        } catch (e: any) {
          return { error: mapPasswordResetError(e) };
        }
      },

      resendPasswordResetOtp: async () => {
        const email = get().pendingPasswordResetEmail;
        if (!email) return { error: i18n.t('authErrors.generic') };
        try {
          await callPasswordResetServer('/api/password-reset/request', { email });
          return { error: null };
        } catch (e: any) {
          return { error: mapPasswordResetError(e) };
        }
      },

      verifyPasswordResetOtp: async (code) => {
        const email = get().pendingPasswordResetEmail;
        if (!email) return { verified: false, error: i18n.t('authErrors.generic') };
        try {
          const json = await callPasswordResetServer('/api/password-reset/verify', { email, code });
          set({ pendingPasswordResetToken: json.resetToken ?? null });
          return { verified: true, error: null };
        } catch (e: any) {
          const locked = e instanceof PasswordResetRequestError && e.code === 'too_many_attempts';
          return { verified: false, error: mapPasswordResetError(e), locked };
        }
      },

      completePasswordReset: async (newPassword) => {
        const { pendingPasswordResetEmail: email, pendingPasswordResetToken: token } = get();
        if (!email || !token) return { error: i18n.t('authErrors.generic') };
        try {
          await callPasswordResetServer('/api/password-reset/complete', { email, token, newPassword });
          set({ pendingPasswordResetEmail: null, pendingPasswordResetToken: null });
          return { error: null };
        } catch (e: any) {
          if (e instanceof PasswordResetRequestError && e.code === 'invalid_or_expired_token') {
            // The token/session is unrecoverable — clear it so the UI can route
            // back to Step 1 rather than let the user retry a dead token.
            set({ pendingPasswordResetEmail: null, pendingPasswordResetToken: null });
          }
          return { error: mapPasswordResetError(e) };
        }
      },

      cancelPasswordReset: () => {
        set({ pendingPasswordResetEmail: null, pendingPasswordResetToken: null });
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
      partialize: (state) => ({ user: state.user, pendingVerificationEmail: state.pendingVerificationEmail }),
    }
  )
);
