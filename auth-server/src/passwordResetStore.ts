import { firestore, admin } from './firebaseAdmin';
import { generateOtp, generateSalt, hashOtp, timingSafeEqualHash } from './otpCrypto';
import { generateResetToken, hashResetToken } from './passwordResetCrypto';
import { config } from './config';

// Separate collections from otpVerifications (otpStore.ts) — this is a fully
// parallel flow, not a variant of the signup/email-verification OTP flow. Both
// are Admin-SDK-only (bypass firestore.rules entirely), same as otpVerifications.
const OTP_COLLECTION = 'passwordResetOtps';
const AUTH_COLLECTION = 'passwordResetAuthorizations';

const EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const RESEND_WINDOW_MS = 60 * 60 * 1000; // 1 hour rolling window
const MAX_RESENDS_PER_WINDOW = 5;
const MAX_ATTEMPTS = 5;
const AUTH_EXPIRY_MS = 10 * 60 * 1000; // reset-authorization token validity

interface PasswordResetOtpRecord {
  // null when no Firebase account exists for the requested email. The record is
  // still created and the cooldown/resend-window logic still runs identically —
  // that symmetry is what keeps a nonexistent email indistinguishable from a
  // real one (see routes/passwordReset.ts).
  uid: string | null;
  email: string;
  codeHash: string;
  salt: string;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  attempts: number;
  lastSentAt: FirebaseFirestore.Timestamp;
  resendCount: number;
  resendWindowStart: FirebaseFirestore.Timestamp;
}

type RequestResult =
  | { status: 'sent'; code: string }
  | { status: 'cooldown'; retryAfterSeconds: number }
  | { status: 'rate_limited'; retryAfterSeconds: number };

// Wrapped in a Firestore transaction so two near-simultaneous requests for the
// same email can't both pass the cooldown/rate-limit check before either writes.
// Called with uid === null for a nonexistent account — every check below runs
// exactly the same either way, so response shape/timing never signals whether
// the account exists.
export async function requestPasswordResetOtp(key: string, uid: string | null, email: string): Promise<RequestResult> {
  const ref = firestore.collection(OTP_COLLECTION).doc(key);
  const now = admin.firestore.Timestamp.now();

  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? (snap.data() as PasswordResetOtpRecord) : null;

    if (existing) {
      const msSinceLastSend = now.toMillis() - existing.lastSentAt.toMillis();
      if (msSinceLastSend < RESEND_COOLDOWN_MS) {
        return {
          status: 'cooldown' as const,
          retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - msSinceLastSend) / 1000),
        };
      }

      const windowElapsed = now.toMillis() - existing.resendWindowStart.toMillis();
      if (windowElapsed < RESEND_WINDOW_MS && existing.resendCount >= MAX_RESENDS_PER_WINDOW) {
        return {
          status: 'rate_limited' as const,
          retryAfterSeconds: Math.ceil((RESEND_WINDOW_MS - windowElapsed) / 1000),
        };
      }
    }

    const windowStillOpen =
      existing != null && now.toMillis() - existing.resendWindowStart.toMillis() < RESEND_WINDOW_MS;

    const code = generateOtp();
    const salt = generateSalt();
    const codeHash = hashOtp(code, salt, config.passwordResetHashPepper);

    const record: PasswordResetOtpRecord = {
      uid,
      email,
      codeHash,
      salt,
      createdAt: now,
      expiresAt: admin.firestore.Timestamp.fromMillis(now.toMillis() + EXPIRY_MS),
      attempts: 0,
      lastSentAt: now,
      resendCount: windowStillOpen ? existing!.resendCount + 1 : 1,
      resendWindowStart: windowStillOpen ? existing!.resendWindowStart : now,
    };

    tx.set(ref, record);
    return { status: 'sent' as const, code };
  });
}

type VerifyResult =
  | { status: 'verified'; uid: string }
  | { status: 'no_pending_otp' }
  | { status: 'too_many_attempts' }
  | { status: 'expired' }
  | { status: 'invalid_code'; attemptsRemaining: number };

// A record with uid === null (nonexistent account) can never return 'verified' —
// even a hash match on that record falls through to 'invalid_code' below, so a
// caller probing a fake email sees exactly the same behavior (including the
// attempt counter ticking down) as someone genuinely guessing wrong.
export async function verifyPasswordResetOtp(key: string, code: string): Promise<VerifyResult> {
  const ref = firestore.collection(OTP_COLLECTION).doc(key);
  const now = admin.firestore.Timestamp.now();

  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { status: 'no_pending_otp' as const };
    const record = snap.data() as PasswordResetOtpRecord;

    if (record.attempts >= MAX_ATTEMPTS) return { status: 'too_many_attempts' as const };
    if (now.toMillis() > record.expiresAt.toMillis()) return { status: 'expired' as const };

    const candidateHash = hashOtp(code, record.salt, config.passwordResetHashPepper);
    const matches = timingSafeEqualHash(candidateHash, record.codeHash) && record.uid !== null;
    if (!matches) {
      const attempts = record.attempts + 1;
      tx.update(ref, { attempts });
      return { status: 'invalid_code' as const, attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts) };
    }

    // Invalidate immediately on success — the code can never be replayed.
    tx.delete(ref);
    return { status: 'verified' as const, uid: record.uid as string };
  });
}

interface PasswordResetAuthorizationRecord {
  uid: string;
  email: string;
  tokenHash: string;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

// Called immediately after verifyPasswordResetOtp returns 'verified'. Returns the
// plaintext token exactly once — the caller (routes/passwordReset.ts) hands it to
// the client and never logs or persists it itself; only its hash lives in
// Firestore. /complete requires this token so that step can't be reached by
// simply POSTing verified=true from the client.
export async function issueResetAuthorization(
  key: string,
  uid: string,
  email: string
): Promise<{ token: string; expiresInSeconds: number }> {
  const ref = firestore.collection(AUTH_COLLECTION).doc(key);
  const now = admin.firestore.Timestamp.now();
  const token = generateResetToken();

  const record: PasswordResetAuthorizationRecord = {
    uid,
    email,
    tokenHash: hashResetToken(token),
    createdAt: now,
    expiresAt: admin.firestore.Timestamp.fromMillis(now.toMillis() + AUTH_EXPIRY_MS),
  };

  await ref.set(record);
  return { token, expiresInSeconds: Math.floor(AUTH_EXPIRY_MS / 1000) };
}

type ConsumeResult = { status: 'consumed'; uid: string } | { status: 'invalid_or_expired' };

// Single-use: deletes the record on success (consumed) and on expiry (cleanup),
// but NOT on a plain hash mismatch — that lets a client retry a transient network
// failure without burning the token. A 256-bit token space makes brute-forcing a
// mismatch infeasible under the route's own per-IP rate limiter.
export async function consumeResetAuthorization(key: string, token: string): Promise<ConsumeResult> {
  const ref = firestore.collection(AUTH_COLLECTION).doc(key);
  const now = admin.firestore.Timestamp.now();

  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { status: 'invalid_or_expired' as const };
    const record = snap.data() as PasswordResetAuthorizationRecord;

    if (now.toMillis() > record.expiresAt.toMillis()) {
      tx.delete(ref);
      return { status: 'invalid_or_expired' as const };
    }

    const candidateHash = hashResetToken(token);
    if (!timingSafeEqualHash(candidateHash, record.tokenHash)) {
      return { status: 'invalid_or_expired' as const };
    }

    tx.delete(ref);
    return { status: 'consumed' as const, uid: record.uid };
  });
}
