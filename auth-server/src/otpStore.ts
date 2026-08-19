import { firestore, admin } from './firebaseAdmin';
import { generateOtp, generateSalt, hashOtp, timingSafeEqualHash } from './otpCrypto';
import { config } from './config';

// Firestore is accessed here exclusively via the Admin SDK, which bypasses
// firestore.rules entirely (standard Admin SDK behavior). The mobile app never
// reads/writes this collection directly — only these HTTP endpoints do — so no
// change to firestore.rules is required.
const COLLECTION = 'otpVerifications';

const EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const RESEND_WINDOW_MS = 60 * 60 * 1000; // 1 hour rolling window
const MAX_RESENDS_PER_WINDOW = 5;
const MAX_ATTEMPTS = 5;

interface OtpRecord {
  uid: string;
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
// same uid can't both pass the cooldown/rate-limit check before either writes.
export async function requestOtp(uid: string, email: string): Promise<RequestResult> {
  const ref = firestore.collection(COLLECTION).doc(uid);
  const now = admin.firestore.Timestamp.now();

  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? (snap.data() as OtpRecord) : null;

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
    const codeHash = hashOtp(code, salt, config.otpHashPepper);

    const record: OtpRecord = {
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
  | { status: 'verified' }
  | { status: 'no_pending_otp' }
  | { status: 'too_many_attempts' }
  | { status: 'expired' }
  | { status: 'invalid_code'; attemptsRemaining: number };

export async function verifyOtp(uid: string, code: string): Promise<VerifyResult> {
  const ref = firestore.collection(COLLECTION).doc(uid);
  const now = admin.firestore.Timestamp.now();

  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { status: 'no_pending_otp' as const };
    const record = snap.data() as OtpRecord;

    if (record.attempts >= MAX_ATTEMPTS) return { status: 'too_many_attempts' as const };
    if (now.toMillis() > record.expiresAt.toMillis()) return { status: 'expired' as const };

    const candidateHash = hashOtp(code, record.salt, config.otpHashPepper);
    if (!timingSafeEqualHash(candidateHash, record.codeHash)) {
      const attempts = record.attempts + 1;
      tx.update(ref, { attempts });
      return { status: 'invalid_code' as const, attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts) };
    }

    // Invalidate immediately on success — the code can never be replayed.
    tx.delete(ref);
    return { status: 'verified' as const };
  });
}
