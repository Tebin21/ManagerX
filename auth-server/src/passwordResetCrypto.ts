import crypto from 'crypto';
import { config } from './config';

// Normalizes an email the same way everywhere it's used as a lookup/storage key,
// so "User@Example.com " and "user@example.com" always resolve to the same
// Firestore records.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Firestore doc key for the password-reset flow. There's no uid to key by until
// after the OTP is verified (the user isn't signed in), so records are keyed by
// a peppered hash of the normalized email instead. Peppering it (rather than
// using the raw email as the doc ID) means a Firestore-only read can't be used
// to enumerate which emails have ever requested a reset.
export function emailKey(email: string): string {
  return crypto.createHash('sha256').update(`${config.passwordResetHashPepper}:${normalizeEmail(email)}`).digest('hex');
}

// crypto.randomBytes (not Math.random) — cryptographically secure. 256 bits is
// infeasible to brute force under any reasonable rate limit, which is why
// consumeResetAuthorization (passwordResetStore.ts) doesn't need an attempt cap
// the way the 6-digit OTP does.
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// The plaintext reset-authorization token is only ever held in memory (client
// state) between /verify and /complete — only this hash is persisted, mirroring
// how otpCrypto.ts's hashOtp keeps the OTP itself out of Firestore.
export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(`${config.passwordResetHashPepper}:${token}`).digest('hex');
}
